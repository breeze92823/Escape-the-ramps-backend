import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("giftPart", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());

  async function pair() {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a", username: "Ann" });
    const b = await colyseus.connectTo(room, { userId: "guest-b", username: "Bob" });
    for (const c of [a, b]) {
      c.onMessage("noProgress", () => {});
      c.onMessage("leaderboard", () => {});
    }
    const got = { aGift: [] as any[], bGift: [] as any[], aFail: [] as any[] };
    a.onMessage("gift", (m: any) => got.aGift.push(m));
    b.onMessage("gift", (m: any) => got.bGift.push(m));
    a.onMessage("giftFailed", (m: any) => got.aFail.push(m));
    await sleep(100);
    return { room, a, b, got };
  }

  it("delivers the part to the target only, named by the sender", async () => {
    const { a, b, got } = await pair();
    a.send("giftPart", { to: b.sessionId, part: "turbo" });
    await sleep(150);
    assert.deepStrictEqual(got.bGift, [{ part: "turbo", from: "Ann" }]);
    assert.deepStrictEqual(got.aGift, []);
    assert.deepStrictEqual(got.aFail, []);
  });

  it("answers giftFailed for self or a missing target, ignores a bad part id", async () => {
    const { a, got } = await pair();
    a.send("giftPart", { to: "nobody", part: "oil" });
    await sleep(2100);
    a.send("giftPart", { to: a.sessionId, part: "plug" });
    await sleep(150);
    a.send("giftPart", { to: "nobody", part: "bad id!" }); // malformed: no reply at all
    await sleep(150);
    assert.deepStrictEqual(got.aFail, [{ part: "oil" }, { part: "plug" }]);
    assert.deepStrictEqual(got.aGift, []);
  });

  it("drops a second gift within 2 s", async () => {
    const { a, b, got } = await pair();
    a.send("giftPart", { to: b.sessionId, part: "turbo" });
    a.send("giftPart", { to: b.sessionId, part: "oil" });
    await sleep(150);
    assert.deepStrictEqual(got.bGift, [{ part: "turbo", from: "Ann" }]);
    assert.deepStrictEqual(got.aFail, []);
  });
});
