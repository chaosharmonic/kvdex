import { Document } from "../../mod.ts"
import { assert } from "../deps.ts"
import { mockUser1, mockUser2, mockUser3 } from "../mocks.ts"
import { User } from "../models.ts"
import { useDb } from "../utils.ts"

Deno.test("indexable_collection - forEachBySecondaryIndex", async (t) => {
  await t.step(
    "Should run callback function for each document in the collection by secondary index",
    async () => {
      await useDb(async (db) => {
        const cr = await db.i_users.addMany([mockUser1, mockUser2, mockUser3])
        assert(cr.ok)

        const docs: Document<User>[] = []
        await db.i_users.forEachBySecondaryIndex(
          "age",
          mockUser1.age,
          (doc) => docs.push(doc),
        )

        assert(docs.length === 2)
        assert(docs.some((doc) => doc.value.username === mockUser1.username))
        assert(docs.some((doc) => doc.value.username === mockUser2.username))
        assert(!docs.some((doc) => doc.value.username === mockUser3.username))
      })
    },
  )
})
