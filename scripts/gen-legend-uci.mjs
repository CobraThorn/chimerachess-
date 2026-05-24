import { Chess } from "chess.js";
import { writeFileSync } from "fs";

function uciFromSanTokens(tokens) {
  const c = new Chess();
  const uci = [];
  for (const m of tokens) {
    const r = c.move(m);
    if (!r) throw new Error(`Invalid: ${m} at ply ${uci.length + 1}`);
    uci.push(r.from + r.to + (r.promotion || ""));
  }
  return uci;
}

function uciFromPgn(pgn) {
  const c = new Chess();
  c.loadPgn(pgn);
  return c.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ""));
}

function splitPgns(text) {
  const games = [];
  let cur = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("[Event ") && cur.length) {
      games.push(cur.join("\n"));
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) games.push(cur.join("\n"));
  return games;
}

const kasparovPgn = `[Event "Hoogovens"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`;

const talPgn = `[Event "Candidates"]
[White "Mikhail Tal"]
[Black "Bent Larsen"]
[Result "1-0"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. Bc4 Bd7 10. O-O-O Rc8 11. Bb3 Ne5 12. h4 Nc4 13. Bxc4 Rxc4 14. g4 Nxd4 15. Qxd4 b5 16. g5 b4 17. Nd5 Ba4 18. Kb1 Rc8 19. Nf4 d5 20. exd5 Na5 21. h6 d4 22. hxg7 Kxg7 23. f4 Rc7 24. f5 Rb7 25. f6+ Kh8 26. Qd3+ e5 27. fxe7 Qxe7 28. Qh3 Qe6 29. Qh5+ Kg8 30. Nh5 Qe8 31. Qxh5 Nc6 32. Rhf1 Na7 33. Nf6+ gxf6 34. Bxf6 Qf7 35. Bxg7 Qxg7 36. Rf3 e4 37. Rh3 Qe5 38. Rh7+ Kf8 39. Rh8# 1-0`;

const out = {
  kasparov: uciFromPgn(kasparovPgn),
  tal: uciFromPgn(talPgn),
};

async function main() {
  const study = await (await fetch("https://lichess.org/api/study/QIIPIEJh.pgn")).text();
  const chapters = splitPgns(study);
  const g10 = chapters.find((g) => g.includes('[Round "10"]'));
  if (g10) out.magnus = uciFromPgn(g10);

  const nakamuraStudy = await (
    await fetch("https://lichess.org/api/study/0YfGJQOT.pgn")
  ).text().catch(() => "");
  if (nakamuraStudy) {
    const ch = splitPgns(nakamuraStudy)[0];
    if (ch) out.hikaru = uciFromPgn(ch);
  }

  for (const [k, v] of Object.entries(out)) {
    console.log(k, v?.length ?? "missing");
  }
  writeFileSync("scripts/legend-uci-out.json", JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  writeFileSync("scripts/legend-uci-out.json", JSON.stringify(out, null, 2));
});
