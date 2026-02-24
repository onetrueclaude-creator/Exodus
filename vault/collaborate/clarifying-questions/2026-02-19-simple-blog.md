# Clarifying Questions: simple-blog

Parent: [[/Users/alisertaccebeci/conclave/vault/product/features/simple-blog/feature]]

## Q1: Where does this project live — is it a new package in the monorepo or a standalone app?

- [ ] New package under `packages/` in the existing monorepo
- [x] Standalone app under `apps/` in the existing monorepo
- [ ] Completely separate directory outside the monorepo

Answer: Standalone app under `apps/` in the existing monorepo

## Q2: How should the post date field be displayed in the UI?

- [ ] Raw ISO string as-is (e.g. "2024-03-15")
- [x] Human-readable format (e.g. "March 15, 2024")
- [ ] Relative format (e.g. "3 days ago")

Answer: Human-readable format (e.g. "March 15, 2024")

## Q3: What is the clickable target for navigating to a post detail view?

- [ ] Only the post title text is clickable
- [x] The entire post card/row is clickable
- [ ] A dedicated "Read more" link/button below the summary

Answer: The entire post card/row is clickable

## Q4: Should the post body support rich content, or is plain text sufficient?

- [x] Plain text only
- [ ] Markdown rendered to HTML (e.g. via a library like `marked`)
- [ ] Raw HTML allowed in the body field

Answer: Plain text only

## Q5: How many hardcoded posts should be seeded in `src/data/posts.ts`?

- [x] Exactly 3 (matching the behavior spec scenarios)
- [ ] More than 3 to better exercise the list UI
- [ ] Any number — the exact count doesn't matter

Answer: Exactly 3 (matching the behavior spec scenarios)

## Q6: Should the tests cover both components (PostList and PostDetail) separately, or only end-to-end via the top-level App component?

- [ ] Unit tests per component plus an integration test on App
- [ ] Integration tests on App only (renders both views)
- [x] One test file mirroring each behavior `.md` file

Answer: One test file mirroring each behavior `.md` file
