import {
  collection,
  kvdex,
  model,
  QueueMessage,
  QueueValue,
} from "../../mod.ts"
import { createHandlerId } from "../../src/utils.ts"
import { assert } from "../deps.ts"
import { User } from "../models.ts"
import { createResolver, useDb, useKv } from "../utils.ts"

Deno.test("serialized_indexable_collection - enqueue", async (t) => {
  await t.step("Should enqueue message with string data", async () => {
    await useKv(async (kv) => {
      const data = "data"
      const undeliveredId = "undelivered"
      const sleeper = createResolver()

      const db = kvdex(kv, {
        is_users: collection(model<User>(), { indices: {}, serialized: true }),
      })

      const handlerId = createHandlerId(db.is_users._keys.base, undefined)

      let assertion = false

      const listener = kv.listenQueue((msg) => {
        const qMsg = msg as QueueMessage<QueueValue>
        assertion = qMsg.__handlerId__ === handlerId && qMsg.__data__ === data
        sleeper.resolve()
      })

      await db.is_users.enqueue(data, {
        idsIfUndelivered: [undeliveredId],
      })

      await sleeper.promise

      const undelivered = await db.is_users.findUndelivered(undeliveredId)
      assert(assertion || typeof undelivered?.value === typeof data)

      return async () => await listener
    })
  })

  await t.step("Should enqueue message in correct topic", async () => {
    await useDb(async (db) => {
      const data = "data"
      const undeliveredId = "undelivered"
      const topic = "topic"
      const sleeper = createResolver()

      let assertion1 = false
      let assertion2 = true

      const l1 = db.is_users.listenQueue(() => {
        assertion1 = true
        sleeper.resolve()
      }, { topic })

      const l2 = db.is_users.listenQueue(() => assertion2 = false)

      await db.is_users.enqueue("data", {
        idsIfUndelivered: [undeliveredId],
        topic,
      })

      await sleeper.promise

      const undelivered = await db.i_users.findUndelivered(undeliveredId)
      assert(assertion1 || typeof undelivered?.value === typeof data)
      assert(assertion2)

      return async () => await Promise.all([l1, l2])
    })
  })
})