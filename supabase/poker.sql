-- Lucas's Arcade - Poker Table (Texas Hold'em for 2 to 6 players, PRETEND CHIPS ONLY).
-- Security model:
--   * All game data lives in the private schema "poker" (not exposed by the Data API). RLS is on and
--     there are NO policies and NO table grants, so nobody can read or write the tables directly.
--   * Every rule (shuffle, deal, betting, side pots, showdown) runs inside SECURITY DEFINER functions
--     in "poker". The browser only calls small SECURITY INVOKER wrappers in "public" (poker_*).
--   * Each seat gets a random secret token when it joins. Every call needs room code + seat token.
--     poker_view returns the public table state plus ONLY that seat's own hole cards. Other players'
--     cards are only included after a showdown (in result.shown), never the deck.
--   * Realtime: after each change the server broadcasts {v: version} on the public topic "room:CODE"
--     (no cards, no secrets). Clients then re-fetch poker_view. Clients also poll as a fallback.

create schema if not exists poker;
revoke all on schema poker from public;

create table if not exists poker.rooms (
  code text primary key,
  host_seat int not null default 0,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'hand_over', 'match_over')),
  allow_join boolean not null default true,
  hand_no int not null default 0,
  button int, sb_seat int, bb_seat int,
  small_blind int not null default 10,
  big_blind int not null default 20,
  start_stack int not null default 1000,
  street text not null default 'none',
  deck int[] not null default '{}',
  deck_pos int not null default 1,
  board int[] not null default '{}',
  cur_bet int not null default 0,
  min_raise int not null default 20,
  to_act int,
  turn_started timestamptz,
  log jsonb not null default '[]',
  result jsonb,
  winner_seat int,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists poker.seats (
  code text not null references poker.rooms(code) on delete cascade,
  seat int not null check (seat between 0 and 5),
  token uuid not null default gen_random_uuid(),
  name text not null,
  avatar text,
  stack int not null default 0,
  hole int[] not null default '{}',
  street_bet int not null default 0,
  total_bet int not null default 0,
  in_hand boolean not null default false,
  folded boolean not null default false,
  all_in boolean not null default false,
  acted boolean not null default false,
  left_room boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (code, seat)
);
alter table poker.rooms add column if not exists match_no int not null default 1;
create index if not exists rooms_updated_at_idx on poker.rooms (updated_at);
alter table poker.rooms enable row level security;
alter table poker.seats enable row level security;
revoke all on all tables in schema poker from public, anon, authenticated;
-- explicit deny-all: nobody reads or writes these tables directly; only the poker.* functions below can
drop policy if exists "no direct access" on poker.rooms;
drop policy if exists "no direct access" on poker.seats;
create policy "no direct access" on poker.rooms as restrictive for all to public using (false) with check (false);
create policy "no direct access" on poker.seats as restrictive for all to public using (false) with check (false);

-- ======================= hand evaluation =======================
-- cards are 0..51: rank = c / 4 + 2 (2..14, 14 = ace), suit = c % 4
create or replace function poker.straight_high(ranks int[]) returns int
language plpgsql immutable set search_path = '' as $$
declare h int;
begin
  for h in reverse 14..5 loop
    if h = 5 then
      if 5 = any(ranks) and 4 = any(ranks) and 3 = any(ranks) and 2 = any(ranks) and 14 = any(ranks) then return 5; end if;
    elsif h = any(ranks) and h - 1 = any(ranks) and h - 2 = any(ranks) and h - 3 = any(ranks) and h - 4 = any(ranks) then
      return h;
    end if;
  end loop;
  return 0;
end $$;

create or replace function poker.mkscore(cat int, tb int[]) returns bigint
language plpgsql immutable set search_path = '' as $$
declare s bigint := cat; i int;
begin
  for i in 1..5 loop s := s * 15 + coalesce(tb[i], 0); end loop;
  return s;
end $$;

-- best 5-card hand out of 5..7 cards -> comparable score (bigger is better)
create or replace function poker.eval7(cards int[]) returns bigint
language plpgsql immutable set search_path = '' as $$
declare
  cnt int[] := array_fill(0, array[14]);
  sc int[] := array_fill(0, array[4]);
  c int; r int; s int; fs int := 0;
  allr int[] := '{}'; flushr int[]; quads int := 0; trips int[] := '{}'; pairs int[] := '{}';
  h int; t2 int; others int[];
begin
  foreach c in array cards loop
    r := c / 4 + 2; s := c % 4 + 1;
    cnt[r] := cnt[r] + 1; sc[s] := sc[s] + 1;
  end loop;
  for s in 1..4 loop if sc[s] >= 5 then fs := s; end if; end loop;
  for r in reverse 14..2 loop
    if cnt[r] > 0 then allr := allr || r; end if;
    if cnt[r] = 4 and quads = 0 then quads := r;
    elsif cnt[r] = 3 then trips := trips || r;
    elsif cnt[r] = 2 then pairs := pairs || r; end if;
  end loop;
  if fs > 0 then
    select array_agg(x order by x desc) into flushr from (select distinct c2 / 4 + 2 as x from unnest(cards) c2 where c2 % 4 + 1 = fs) q;
    h := poker.straight_high(flushr);
    if h > 0 then return poker.mkscore(8, array[h]); end if;
  end if;
  if quads > 0 then
    select max(x) into t2 from unnest(allr) x where x <> quads;
    return poker.mkscore(7, array[quads, t2]);
  end if;
  if array_length(trips, 1) >= 1 and (array_length(trips, 1) >= 2 or array_length(pairs, 1) >= 1) then
    t2 := greatest(coalesce(trips[2], 0), coalesce(pairs[1], 0));
    return poker.mkscore(6, array[trips[1], t2]);
  end if;
  if fs > 0 then return poker.mkscore(5, flushr[1:5]); end if;
  h := poker.straight_high(allr);
  if h > 0 then return poker.mkscore(4, array[h]); end if;
  if array_length(trips, 1) >= 1 then
    select array_agg(x order by x desc) into others from unnest(allr) x where x <> trips[1];
    return poker.mkscore(3, array[trips[1]] || others[1:2]);
  end if;
  if array_length(pairs, 1) >= 2 then
    select max(x) into t2 from unnest(allr) x where x <> pairs[1] and x <> pairs[2];
    return poker.mkscore(2, array[pairs[1], pairs[2], t2]);
  end if;
  if array_length(pairs, 1) = 1 then
    select array_agg(x order by x desc) into others from unnest(allr) x where x <> pairs[1];
    return poker.mkscore(1, array[pairs[1]] || others[1:3]);
  end if;
  return poker.mkscore(0, allr[1:5]);
end $$;

create or replace function poker.hand_name(score bigint) returns text
language sql immutable set search_path = '' as $$
  select case (score / 759375)::int
    when 8 then case when (score / 50625) % 15 = 14 then 'Royal Flush' else 'Straight Flush' end
    when 7 then 'Four of a Kind' when 6 then 'Full House' when 5 then 'Flush' when 4 then 'Straight'
    when 3 then 'Three of a Kind' when 2 then 'Two Pair' when 1 then 'Pair' else 'High Card' end
$$;

-- ======================= helpers =======================
create or replace function poker.bump(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  update poker.rooms set version = version + 1, updated_at = now() where code = p_code returning version into v;
  begin
    perform realtime.send(jsonb_build_object('v', v), 'update', 'room:' || p_code, false);   -- public signal, no secrets
  exception when others then null;   -- polling still works if Realtime is unavailable
  end;
end $$;

create or replace function poker.addlog(p_code text, p_text text) returns void
language sql security definer set search_path = '' as $$
  update poker.rooms set log = (select coalesce(jsonb_agg(e order by n), '[]'::jsonb)
    from (select e, n from jsonb_array_elements(log || jsonb_build_array(p_text)) with ordinality t(e, n) order by n desc limit 8) q)
  where code = p_code;
$$;

create or replace function poker.seat_for(p_code text, p_token uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare s int;
begin
  select seat into s from poker.seats where code = upper(p_code) and token = p_token and not left_room;
  if s is null then raise exception 'not_seated' using hint = 'Your seat token does not match this table.'; end if;
  return s;
end $$;

-- next seat clockwise after p_from that matches a mode:
--   'eligible' = still in the match (has chips, not left);  'inhand' = dealt into this hand;
--   'canact' = in the hand, not folded, not all-in
create or replace function poker.next_seat(p_code text, p_from int, p_mode text) returns int
language sql stable security definer set search_path = '' as $$
  select seat from poker.seats
  where code = p_code and case p_mode
    when 'eligible' then not left_room and stack > 0
    when 'inhand' then in_hand
    else in_hand and not folded and not all_in end
  order by (seat - p_from - 1 + 12) % 6 limit 1
$$;

create or replace function poker.put(p_code text, p_seat int, p_amt int) returns void
language sql security definer set search_path = '' as $$
  update poker.seats set stack = stack - p_amt, street_bet = street_bet + p_amt, total_bet = total_bet + p_amt,
    all_in = (stack - p_amt = 0)
  where code = p_code and seat = p_seat;
$$;

-- ======================= hand flow =======================
create or replace function poker.finish_hand(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare n int; w int;
begin
  select count(*), min(seat) into n, w from poker.seats where code = p_code and not left_room and stack > 0;
  if n <= 1 then
    update poker.rooms set status = 'match_over', winner_seat = w, to_act = null where code = p_code;
  else
    update poker.rooms set status = 'hand_over', to_act = null where code = p_code;
  end if;
end $$;

create or replace function poker.award_uncontested(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare w int; pot int; nm text;
begin
  select seat, name into w, nm from poker.seats where code = p_code and in_hand and not folded limit 1;
  select coalesce(sum(total_bet), 0) into pot from poker.seats where code = p_code;
  update poker.seats set stack = stack + pot where code = p_code and seat = w;
  update poker.seats set street_bet = 0 where code = p_code;
  update poker.rooms set street = 'done',
    result = jsonb_build_object('uncontested', true, 'pots', jsonb_build_array(jsonb_build_object('amount', pot, 'winners', jsonb_build_array(w), 'hand', null)), 'shown', '{}'::jsonb)
  where code = p_code;
  perform poker.addlog(p_code, nm || ' wins ' || pot || ' chips');
  perform poker.finish_hand(p_code);
end $$;

create or replace function poker.showdown(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  rm poker.rooms; lvl int; prev int := 0; amt int; elig int[]; pots jsonb := '[]'; accounted int := 0; total int;
  best bigint; winners int[]; share int; rem int; i int; w int; shown jsonb := '{}'; sc bigint; rec record; p jsonb; out jsonb := '[]';
  prev_elig int[] := null;
begin
  select * into rm from poker.rooms where code = p_code;
  -- what each player still in the hand is showing
  for rec in select seat, hole, name from poker.seats where code = p_code and in_hand and not folded order by seat loop
    sc := poker.eval7(rec.hole || rm.board);
    shown := shown || jsonb_build_object(rec.seat::text, jsonb_build_object('cards', to_jsonb(rec.hole), 'hand', poker.hand_name(sc), 'score', sc));
  end loop;
  -- main pot + side pots, one per all-in level
  select coalesce(sum(total_bet), 0) into total from poker.seats where code = p_code;
  for lvl in select distinct total_bet from poker.seats where code = p_code and in_hand and not folded and total_bet > 0 order by 1 loop
    select coalesce(sum(least(total_bet, lvl) - least(total_bet, prev)), 0) into amt from poker.seats where code = p_code;
    select array_agg(seat order by seat) into elig from poker.seats where code = p_code and in_hand and not folded and total_bet >= lvl;
    if prev_elig is not null and prev_elig = elig then      -- same players: merge into the previous pot
      pots := jsonb_set(pots, array[(jsonb_array_length(pots) - 1)::text, 'amount'], to_jsonb((pots -> (jsonb_array_length(pots) - 1) ->> 'amount')::int + amt));
    else
      pots := pots || jsonb_build_array(jsonb_build_object('amount', amt, 'elig', to_jsonb(elig)));
    end if;
    prev_elig := elig; accounted := accounted + amt; prev := lvl;
  end loop;
  if total > accounted and jsonb_array_length(pots) > 0 then   -- chips from folded players above the top level
    pots := jsonb_set(pots, array[(jsonb_array_length(pots) - 1)::text, 'amount'], to_jsonb((pots -> (jsonb_array_length(pots) - 1) ->> 'amount')::int + total - accounted));
  end if;
  -- pay each pot to the best hand(s) among the players who can win it; odd chips go clockwise from the button
  for p in select * from jsonb_array_elements(pots) loop
    select max((shown -> e ->> 'score')::bigint) into best from jsonb_array_elements_text(p -> 'elig') e;
    select array_agg(e::int order by (e::int - rm.button - 1 + 12) % 6) into winners
      from jsonb_array_elements_text(p -> 'elig') e where (shown -> e ->> 'score')::bigint = best;
    amt := (p ->> 'amount')::int; share := amt / array_length(winners, 1); rem := amt % array_length(winners, 1);
    for i in 1..array_length(winners, 1) loop
      w := winners[i];
      update poker.seats set stack = stack + share + case when i <= rem then 1 else 0 end where code = p_code and seat = w;
    end loop;
    out := out || jsonb_build_array(jsonb_build_object('amount', amt, 'winners', to_jsonb(winners), 'elig', p -> 'elig', 'hand', poker.hand_name(best)));
  end loop;
  update poker.seats set street_bet = 0 where code = p_code;
  update poker.rooms set street = 'showdown', result = jsonb_build_object('uncontested', false, 'pots', out, 'shown', shown) where code = p_code;
  perform poker.addlog(p_code, 'Showdown!');
  perform poker.finish_hand(p_code);
end $$;

create or replace function poker.next_street(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare rm poker.rooms; n int; ncan int; nxt text; nxt_seat int;
begin
  select * into rm from poker.rooms where code = p_code;
  update poker.seats set street_bet = 0, acted = false where code = p_code;
  if rm.street = 'river' then perform poker.showdown(p_code); return; end if;
  n := case rm.street when 'preflop' then 3 else 1 end;
  nxt := case rm.street when 'preflop' then 'flop' when 'flop' then 'turn' else 'river' end;
  update poker.rooms set board = board || deck[deck_pos + 1 : deck_pos + n], deck_pos = deck_pos + n + 1,   -- burn one, deal n
    street = nxt, cur_bet = 0, min_raise = big_blind where code = p_code;
  perform poker.addlog(p_code, initcap(nxt) || '!');
  select count(*) into ncan from poker.seats where code = p_code and in_hand and not folded and not all_in;
  if ncan <= 1 then perform poker.next_street(p_code); return; end if;   -- everyone else all-in: run out the board
  nxt_seat := poker.next_seat(p_code, rm.button, 'canact');
  update poker.rooms set to_act = nxt_seat, turn_started = now() where code = p_code;
end $$;

-- after an action (or the blinds): who's next, or is the betting round over?
create or replace function poker.progress(p_code text, p_from int) returns void
language plpgsql security definer set search_path = '' as $$
declare rm poker.rooms; nact int; ncan int; nxt int; lone_bet int;
begin
  select * into rm from poker.rooms where code = p_code;
  select count(*) into nact from poker.seats where code = p_code and in_hand and not folded;
  if nact <= 1 then perform poker.award_uncontested(p_code); return; end if;
  select count(*), max(street_bet) into ncan, lone_bet from poker.seats where code = p_code and in_hand and not folded and not all_in;
  if ncan = 0 or (ncan = 1 and lone_bet >= rm.cur_bet) then perform poker.next_street(p_code); return; end if;
  select seat into nxt from poker.seats
    where code = p_code and in_hand and not folded and not all_in and (not acted or street_bet < rm.cur_bet)
    order by (seat - p_from - 1 + 12) % 6 limit 1;
  if nxt is null then perform poker.next_street(p_code); return; end if;
  update poker.rooms set to_act = nxt, turn_started = now() where code = p_code;
end $$;

create or replace function poker.start_hand(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare rm poker.rooms; n int; btn int; sb int; bb int; v_deck int[]; pos int := 1; r int; s int; first_s int; sbname text; bbname text;
begin
  select * into rm from poker.rooms where code = p_code for update;
  select count(*) into n from poker.seats where code = p_code and not left_room and stack > 0;
  if n < 2 then perform poker.finish_hand(p_code); return; end if;
  update poker.seats set in_hand = (not left_room and stack > 0), folded = false, all_in = false, acted = false,
    street_bet = 0, total_bet = 0, hole = '{}' where code = p_code;
  -- dealer button moves one seat to the left each hand (skipping busted/left players)
  if rm.button is null then select min(seat) into btn from poker.seats where code = p_code and in_hand;
  else btn := poker.next_seat(p_code, rm.button, 'inhand'); end if;
  if n = 2 then sb := btn; bb := poker.next_seat(p_code, btn, 'inhand');        -- heads-up: button posts the small blind
  else sb := poker.next_seat(p_code, btn, 'inhand'); bb := poker.next_seat(p_code, sb, 'inhand'); end if;
  select array_agg(c order by random()) into v_deck from generate_series(0, 51) c;
  -- two cards each, one at a time, starting left of the button
  first_s := poker.next_seat(p_code, btn, 'inhand');
  for r in 1..2 loop
    s := first_s;
    loop
      update poker.seats set hole = hole || v_deck[pos] where code = p_code and seat = s;
      pos := pos + 1;
      s := poker.next_seat(p_code, s, 'inhand');
      exit when s = first_s;
    end loop;
  end loop;
  update poker.rooms set status = 'playing', hand_no = hand_no + 1, button = btn, sb_seat = sb, bb_seat = bb, deck = v_deck, deck_pos = pos,
    board = '{}', street = 'preflop', cur_bet = 0, min_raise = big_blind, result = null, winner_seat = null, log = '[]'::jsonb
  where code = p_code;
  perform poker.put(p_code, sb, least(rm.small_blind, (select stack from poker.seats where code = p_code and seat = sb)));
  perform poker.put(p_code, bb, least(rm.big_blind, (select stack from poker.seats where code = p_code and seat = bb)));
  update poker.rooms set cur_bet = (select max(street_bet) from poker.seats where code = p_code) where code = p_code;
  select name into sbname from poker.seats where code = p_code and seat = sb;
  select name into bbname from poker.seats where code = p_code and seat = bb;
  perform poker.addlog(p_code, 'Hand #' || (rm.hand_no + 1) || ': ' || sbname || ' small blind, ' || bbname || ' big blind');
  -- first to act preflop: heads-up the button/small blind, otherwise the player left of the big blind
  perform poker.progress(p_code, case when n = 2 then bb else bb end);
end $$;

-- ======================= things players can do =======================
create or replace function poker.view(p_code text, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me int; rm poker.rooms; ms poker.seats; out jsonb; v_seats jsonb; pot int; ta poker.seats;
begin
  p_code := upper(p_code);
  me := poker.seat_for(p_code, p_token);
  update poker.seats set last_seen = now() where code = p_code and seat = me;
  select * into rm from poker.rooms where code = p_code for update;
  -- a player who left (or has been away for a while) on their turn is checked/folded automatically
  if rm.status = 'playing' and rm.to_act is not null then
    select * into ta from poker.seats where code = p_code and seat = rm.to_act;
    if ta.left_room or (now() - rm.turn_started > interval '75 seconds' and now() - ta.last_seen > interval '30 seconds') then
      if ta.street_bet >= rm.cur_bet then
        update poker.seats set acted = true where code = p_code and seat = ta.seat;
        perform poker.addlog(p_code, ta.name || ' checks (away)');
      else
        update poker.seats set folded = true, acted = true where code = p_code and seat = ta.seat;
        perform poker.addlog(p_code, ta.name || ' folds (away)');
      end if;
      perform poker.progress(p_code, ta.seat);
      perform poker.bump(p_code);
      select * into rm from poker.rooms where code = p_code;
    end if;
  end if;
  select * into ms from poker.seats where code = p_code and seat = me;
  select coalesce(sum(total_bet), 0) into pot from poker.seats where code = p_code;
  select jsonb_agg(jsonb_build_object(
      'seat', s.seat, 'name', s.name, 'avatar', s.avatar, 'stack', s.stack, 'bet', s.street_bet, 'total', s.total_bet,
      'in_hand', s.in_hand, 'folded', s.folded, 'all_in', s.all_in, 'left', s.left_room,
      'away', now() - s.last_seen > interval '25 seconds', 'busted', s.stack = 0 and not s.in_hand and rm.hand_no > 0,
      'has_cards', s.in_hand and not s.folded and rm.status <> 'lobby') order by s.seat)
    into v_seats from poker.seats s where s.code = p_code;
  out := jsonb_build_object(
    'code', rm.code, 'me', me, 'match_no', rm.match_no, 'host', rm.host_seat, 'status', rm.status, 'allow_join', rm.allow_join, 'hand_no', rm.hand_no,
    'button', rm.button, 'sb', rm.sb_seat, 'bb', rm.bb_seat, 'small_blind', rm.small_blind, 'big_blind', rm.big_blind,
    'street', rm.street, 'board', to_jsonb(rm.board), 'pot', pot, 'cur_bet', rm.cur_bet, 'to_act', rm.to_act,
    'turn_age', extract(epoch from now() - rm.turn_started)::int, 'log', rm.log, 'result', rm.result, 'winner', rm.winner_seat,
    'version', rm.version, 'seats', v_seats,
    'my_cards', case when ms.in_hand then to_jsonb(ms.hole) else '[]'::jsonb end,
    'to_call', greatest(0, least(rm.cur_bet - ms.street_bet, ms.stack)),
    'min_raise_to', least(rm.cur_bet + rm.min_raise, ms.street_bet + ms.stack),
    'max_raise_to', ms.street_bet + ms.stack);
  return out;
end $$;

create or replace function poker.create_room(p_name text, p_avatar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c text; tok uuid; tries int := 0; letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
begin
  delete from poker.rooms where updated_at < now() - interval '24 hours';   -- tidy up old tables
  loop
    c := ''; for i in 1..4 loop c := c || substr(letters, 1 + floor(random() * 24)::int, 1); end loop;
    exit when not exists (select 1 from poker.rooms where code = c);
    tries := tries + 1; if tries > 50 then raise exception 'no_free_code'; end if;
  end loop;
  insert into poker.rooms (code) values (c);
  insert into poker.seats (code, seat, name, avatar, stack) values (c, 0, left(coalesce(nullif(trim(p_name), ''), 'Player'), 16), left(p_avatar, 24), 1000)
    returning token into tok;
  perform poker.addlog(c, left(coalesce(nullif(trim(p_name), ''), 'Player'), 16) || ' opened the table');
  perform poker.bump(c);
  return jsonb_build_object('code', c, 'seat', 0, 'token', tok);
end $$;

create or replace function poker.join_room(p_code text, p_name text, p_avatar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare rm poker.rooms; s int; tok uuid; nm text := left(coalesce(nullif(trim(p_name), ''), 'Player'), 16);
begin
  p_code := upper(trim(p_code));
  select * into rm from poker.rooms where code = p_code for update;
  if rm.code is null then raise exception 'no_such_table'; end if;
  if not (rm.status = 'lobby' or (rm.allow_join and rm.status <> 'match_over')) then raise exception 'table_closed'; end if;
  delete from poker.seats where code = p_code and left_room and not in_hand;     -- free seats of players who left
  select min(x) into s from generate_series(0, 5) x where not exists (select 1 from poker.seats where code = p_code and seat = x);
  if s is null then raise exception 'table_full'; end if;
  insert into poker.seats (code, seat, name, avatar, stack) values (p_code, s, nm, left(p_avatar, 24), rm.start_stack) returning token into tok;
  perform poker.addlog(p_code, nm || ' sat down' || case when rm.status = 'lobby' then '' else ' (plays next hand)' end);
  perform poker.bump(p_code);
  return jsonb_build_object('code', p_code, 'seat', s, 'token', tok);
end $$;

create or replace function poker.start_game(p_code text, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me int; rm poker.rooms;
begin
  p_code := upper(p_code); me := poker.seat_for(p_code, p_token);
  select * into rm from poker.rooms where code = p_code for update;
  if rm.host_seat <> me then raise exception 'host_only'; end if;
  if rm.status <> 'lobby' then raise exception 'already_started'; end if;
  if (select count(*) from poker.seats where code = p_code and not left_room) < 2 then raise exception 'need_two_players'; end if;
  update poker.rooms set allow_join = false where code = p_code;
  perform poker.start_hand(p_code);
  perform poker.bump(p_code);
  return poker.view(p_code, p_token);
end $$;

create or replace function poker.act(p_code text, p_token uuid, p_action text, p_amount int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me int; rm poker.rooms; ms poker.seats; to_call int; target int; maxto int; amt int; msg text;
begin
  p_code := upper(p_code); me := poker.seat_for(p_code, p_token);
  select * into rm from poker.rooms where code = p_code for update;
  if rm.status <> 'playing' or rm.to_act is distinct from me then raise exception 'not_your_turn'; end if;
  select * into ms from poker.seats where code = p_code and seat = me;
  to_call := rm.cur_bet - ms.street_bet;
  maxto := ms.street_bet + ms.stack;
  if p_action = 'fold' then
    update poker.seats set folded = true where code = p_code and seat = me; msg := 'folds';
  elsif p_action = 'check' then
    if to_call > 0 then raise exception 'cannot_check'; end if; msg := 'checks';
  elsif p_action = 'call' then
    if to_call <= 0 then msg := 'checks';
    else amt := least(to_call, ms.stack); perform poker.put(p_code, me, amt);
      msg := case when amt = ms.stack then 'calls all-in (' || amt || ')' else 'calls ' || amt end; end if;
  elsif p_action in ('bet', 'raise', 'allin') then
    target := case when p_action = 'allin' then maxto else least(coalesce(p_amount, 0), maxto) end;
    if target <= rm.cur_bet then
      if target < maxto then raise exception 'raise_too_small'; end if;
      amt := ms.stack; perform poker.put(p_code, me, amt); msg := 'calls all-in (' || amt || ')';   -- all-in for less than a call
    else
      if target < rm.cur_bet + rm.min_raise and target < maxto then raise exception 'raise_too_small'; end if;
      perform poker.put(p_code, me, target - ms.street_bet);
      if target - rm.cur_bet >= rm.min_raise then
        update poker.rooms set min_raise = target - rm.cur_bet where code = p_code;
        update poker.seats set acted = false where code = p_code and seat <> me;      -- a full raise re-opens the betting
      end if;
      update poker.rooms set cur_bet = target where code = p_code;
      msg := case when target = maxto then 'goes ALL-IN (' || target || ')' when rm.cur_bet = 0 then 'bets ' || target else 'raises to ' || target end;
    end if;
  else
    raise exception 'bad_action';
  end if;
  update poker.seats set acted = true where code = p_code and seat = me;
  perform poker.addlog(p_code, ms.name || ' ' || msg);
  perform poker.progress(p_code, me);
  perform poker.bump(p_code);
  return poker.view(p_code, p_token);
end $$;

create or replace function poker.next_hand(p_code text, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me int; st text;
begin
  p_code := upper(p_code); me := poker.seat_for(p_code, p_token);
  select status into st from poker.rooms where code = p_code for update;
  if st = 'hand_over' then perform poker.start_hand(p_code); perform poker.bump(p_code); end if;   -- 2nd tap is a no-op
  return poker.view(p_code, p_token);
end $$;

create or replace function poker.rematch(p_code text, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me int; st text;
begin
  p_code := upper(p_code); me := poker.seat_for(p_code, p_token);
  select status into st from poker.rooms where code = p_code for update;
  if st = 'match_over' then
    delete from poker.seats where code = p_code and left_room;
    update poker.seats set stack = (select start_stack from poker.rooms where code = p_code), in_hand = false where code = p_code;
    update poker.rooms set button = null, hand_no = 0, winner_seat = null, match_no = match_no + 1 where code = p_code;
    perform poker.addlog(p_code, 'Rematch!');
    perform poker.start_hand(p_code); perform poker.bump(p_code);
  end if;
  return poker.view(p_code, p_token);
end $$;

create or replace function poker.set_open(p_code text, p_token uuid, p_open boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me int;
begin
  p_code := upper(p_code); me := poker.seat_for(p_code, p_token);
  if (select host_seat from poker.rooms where code = p_code) <> me then raise exception 'host_only'; end if;
  update poker.rooms set allow_join = p_open where code = p_code;
  perform poker.bump(p_code);
  return poker.view(p_code, p_token);
end $$;

create or replace function poker.leave_room(p_code text, p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me int; rm poker.rooms; nm text; newhost int;
begin
  p_code := upper(p_code); me := poker.seat_for(p_code, p_token);
  select * into rm from poker.rooms where code = p_code for update;
  select name into nm from poker.seats where code = p_code and seat = me;
  if rm.status = 'lobby' then delete from poker.seats where code = p_code and seat = me;
  else update poker.seats set left_room = true, folded = folded or in_hand where code = p_code and seat = me; end if;
  perform poker.addlog(p_code, nm || ' left the table');
  if rm.host_seat = me then
    select min(seat) into newhost from poker.seats where code = p_code and not left_room;
    if newhost is null then delete from poker.rooms where code = p_code; return; end if;
    update poker.rooms set host_seat = newhost where code = p_code;
  end if;
  if rm.status = 'playing' then
    if rm.to_act = me then perform poker.progress(p_code, me);
    elsif (select count(*) from poker.seats where code = p_code and in_hand and not folded) <= 1 then perform poker.award_uncontested(p_code); end if;
  elsif rm.status = 'hand_over' then perform poker.finish_hand(p_code);
  end if;
  perform poker.bump(p_code);
end $$;

-- ======================= public API (what the browser can call) =======================
create or replace function public.poker_create(p_name text, p_avatar text) returns jsonb language sql security invoker set search_path = '' as $$ select poker.create_room(p_name, p_avatar) $$;
create or replace function public.poker_join(p_code text, p_name text, p_avatar text) returns jsonb language sql security invoker set search_path = '' as $$ select poker.join_room(p_code, p_name, p_avatar) $$;
create or replace function public.poker_view(p_code text, p_token uuid) returns jsonb language sql security invoker set search_path = '' as $$ select poker.view(p_code, p_token) $$;
create or replace function public.poker_start(p_code text, p_token uuid) returns jsonb language sql security invoker set search_path = '' as $$ select poker.start_game(p_code, p_token) $$;
create or replace function public.poker_act(p_code text, p_token uuid, p_action text, p_amount int default null) returns jsonb language sql security invoker set search_path = '' as $$ select poker.act(p_code, p_token, p_action, p_amount) $$;
create or replace function public.poker_next(p_code text, p_token uuid) returns jsonb language sql security invoker set search_path = '' as $$ select poker.next_hand(p_code, p_token) $$;
create or replace function public.poker_rematch(p_code text, p_token uuid) returns jsonb language sql security invoker set search_path = '' as $$ select poker.rematch(p_code, p_token) $$;
create or replace function public.poker_set_open(p_code text, p_token uuid, p_open boolean) returns jsonb language sql security invoker set search_path = '' as $$ select poker.set_open(p_code, p_token, p_open) $$;
create or replace function public.poker_leave(p_code text, p_token uuid) returns void language sql security invoker set search_path = '' as $$ select poker.leave_room(p_code, p_token) $$;

-- ======================= privileges =======================
revoke execute on all functions in schema poker from public, anon, authenticated;
grant usage on schema poker to anon, authenticated;
grant execute on function poker.create_room(text, text), poker.join_room(text, text, text), poker.view(text, uuid),
  poker.start_game(text, uuid), poker.act(text, uuid, text, int), poker.next_hand(text, uuid), poker.rematch(text, uuid),
  poker.set_open(text, uuid, boolean), poker.leave_room(text, uuid) to anon, authenticated;
revoke execute on function public.poker_create(text, text), public.poker_join(text, text, text), public.poker_view(text, uuid),
  public.poker_start(text, uuid), public.poker_act(text, uuid, text, int), public.poker_next(text, uuid), public.poker_rematch(text, uuid),
  public.poker_set_open(text, uuid, boolean), public.poker_leave(text, uuid) from public;
grant execute on function public.poker_create(text, text), public.poker_join(text, text, text), public.poker_view(text, uuid),
  public.poker_start(text, uuid), public.poker_act(text, uuid, text, int), public.poker_next(text, uuid), public.poker_rematch(text, uuid),
  public.poker_set_open(text, uuid, boolean), public.poker_leave(text, uuid) to anon, authenticated;

-- ======================= cleanup: tables idle for more than 24 hours are deleted every hour =======================
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'poker-cleanup';
select cron.schedule('poker-cleanup', '17 * * * *', $$delete from poker.rooms where updated_at < now() - interval '24 hours'$$);
