WITH ranked_proposals AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "conversationId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS proposal_rank
  FROM "MissionAgreement"
  WHERE "status" = 'PROPOSED'
)
UPDATE "MissionAgreement"
SET "status" = 'EXPIRED'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_proposals
  WHERE proposal_rank > 1
);

CREATE UNIQUE INDEX "MissionAgreement_one_proposed_per_conversation"
ON "MissionAgreement" ("conversationId")
WHERE "status" = 'PROPOSED';
