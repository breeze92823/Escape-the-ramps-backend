import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { __setPlayersForTest } from "../src/db.js";
import { fakePlayers, sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("progress", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());
  afterEach(() => __setPlayersForTest(null));

  it("sends a saved player their progress and saves what they send back", async () => {
    const fake = fakePlayers([{ _id: "u1", wins: 5000, owned: ["tiger", "bull"], car: "bull", playtime: 900, version: 1, updatedAt: new Date() }]);
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { userId: "u1", username: "Ann" });
    let got: any = null;
    c.onMessage("progress", (m: any) => (got = m));
    fake.release();
    await sleep(150);
    assert.strictEqual(got?.wins, 5000);
    assert.deepStrictEqual(got?.owned, ["tiger", "bull"]);
    assert.strictEqual(got?.car, "bull");

    const until = Date.now() + 60_000;
    c.send("saveProgress", { wins: 7000, gems: 3, playtime: 400, owned: ["tiger"], car: "tiger", vip: true, balloonsUntil: until, wingsUntil: until + 1, hack: 1 });
    await sleep(150);
    const doc = fake.docs.get("u1")! as any;
    assert.strictEqual(doc.wins, 7000);
    assert.strictEqual(doc.gems, 3);
    assert.strictEqual(doc.car, "tiger");
    assert.strictEqual(doc.playtime, 900, "playtime never goes down");
    assert.strictEqual(doc.username, "Ann");
    assert.ok(!("hack" in doc));
    assert.strictEqual(doc.vip, true);
    assert.strictEqual(doc.balloonsUntil, until);
    assert.strictEqual(doc.wingsUntil, until + 1);

    // ...and they come back on the next load.
    const fake2 = fakePlayers([doc]);
    __setPlayersForTest(fake2);
    const c2 = await colyseus.connectTo(room, { userId: "u1", username: "Ann" });
    let again: any = null;
    c2.onMessage("progress", (m: any) => (again = m));
    fake2.release();
    await sleep(150);
    assert.strictEqual(again?.vip, true);
    assert.strictEqual(again?.balloonsUntil, until);
    assert.strictEqual(again?.wingsUntil, until + 1);
  });

  it("creates a new account's save and never saves a guest", async () => {
    const fake = fakePlayers();
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { userId: "new1" });
    let none = false;
    c.onMessage("noProgress", () => (none = true));
    fake.release();
    await sleep(150);
    assert.ok(none);
    c.send("saveProgress", { wins: 10 });
    await sleep(150);
    assert.strictEqual(fake.docs.get("new1")?.wins, 10);

    const guest = await colyseus.connectTo(room, { userId: "guest-abc" });
    guest.onMessage("noProgress", () => {});
    await sleep(150);
    guest.send("saveProgress", { wins: 99 });
    await sleep(150);
    assert.strictEqual(fake.docs.size, 1, "a guest is never written");
    assert.strictEqual(room.state.players.get(guest.sessionId)?.signedIn, false);
  });

  it("loads the new identity when a guest signs in mid-session", async () => {
    const fake = fakePlayers([{ _id: "u2", wins: 42, version: 1, updatedAt: new Date() }]);
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { userId: "guest-x" });
    let got: any = null;
    c.onMessage("noProgress", () => {});
    c.onMessage("progress", (m: any) => (got = m));
    fake.release();
    await sleep(150);
    c.send("identify", { userId: "u2", username: "Bea" });
    await sleep(150);
    assert.strictEqual(got?.wins, 42);
    assert.strictEqual(room.state.players.get(c.sessionId)?.signedIn, true);
  });

  it("keeps saving off when the save could not be read", async () => {
    const fake = fakePlayers([{ _id: "u3", wins: 1e9, version: 1, updatedAt: new Date() }]);
    (fake as any).findOne = async () => {
      await fake.gate;
      throw new Error("down");
    };
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { userId: "u3" });
    let failed = false;
    c.onMessage("serverError", () => (failed = true));
    fake.release();
    await sleep(150);
    assert.ok(failed);
    c.send("saveProgress", { wins: 0 });
    await sleep(150);
    assert.strictEqual(fake.docs.get("u3")!.wins, 1e9, "the unread save is never overwritten");
  });
});
