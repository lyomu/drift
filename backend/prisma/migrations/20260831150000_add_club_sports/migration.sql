-- Club.sports — which sports a club runs (defaults to TENNIS for every
-- existing club). NOT run this session; applied in the later verification pass.
ALTER TABLE "clubs"
  ADD COLUMN "sports" "MatchSport"[] DEFAULT ARRAY['TENNIS']::"MatchSport"[];
