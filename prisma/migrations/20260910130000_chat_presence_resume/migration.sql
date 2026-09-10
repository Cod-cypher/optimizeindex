-- Send-guards for the two notifications a conversation that outlives the
-- browser tab makes possible: the visitor coming back, and the visitor leaving
-- before anyone reached them. Both nullable, so this is additive and needs no
-- backfill.
-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN     "resumedEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "visitorLeftEmailSentAt" TIMESTAMP(3);
