---
description: Contract-based API testing — happy path, validation, auth/authz, semantics, compatibility — with a re-runnable test collection
argument-hint: <API spec path/URL or base URL, auth details, endpoints in scope>
---

Test this API:

$ARGUMENTS

1. Find the contract (OpenAPI/Swagger, GraphQL schema, Postman collection, docs, or route code), the test environment base URL, and how to authenticate with test accounts. Ask the user if there is no safe non-production environment.
2. Launch `tester-squad:api-tester` with that information. It builds a runnable test collection (the project's API test framework if one exists, otherwise `.qa/api/<slug>/`), runs it, and writes `.qa/runs/<date>-api-<slug>.md` with a coverage matrix, failures and contract mismatches. Credentials must come from environment variables, never files.
3. Launch `tester-squad:bug-triager` to write up the failures.
4. Summarise: coverage, failures by severity, contract mismatches, and the command to re-run the suite.
