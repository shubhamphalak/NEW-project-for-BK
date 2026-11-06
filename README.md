# ART Insurance Advisor

Responsive English/Arabic insurance advisor using the existing JavaScript frontend and dependency-free Node.js backend. Node.js 22.12+ is required; the Windows launcher can use Microsoft VS Code's bundled runtime.

## Start

From the workspace root, run .\art-insurance\start.cmd and open http://127.0.0.1:4173. With Node installed, use cd art-insurance followed by npm start. Restart an already running server and refresh the browser after updates. No dependency installation is needed. This application binds to loopback only.

The existing private .env and OpenAI key were preserved by the conversational update. OPENAI_MODEL=gpt-4.1 selects the server-side model. LLM_ENABLED=true and MOCK_LLM_MODE=false enable live requests; OPENAI_API_KEY is read only on the backend. .env.example leaves its key blank. .env is excluded from version control and HTTP access. Nonempty inherited environment variables override .env values.

## Current conversation experience

- A processing bubble appears below the latest user message. Its bilingual label follows actual backend lifecycle events and the current request, such as understanding a revised budget, reviewing motor cover or checking dated evidence. Once backend work completes, it says Preparing your reply until the response is displayed. There is no timed carousel of unrelated stages. The 3.5-second minimum display duration remains.
- Guest entry begins with What’s on your mind? There is no name, email or phone gate. Follow-up questions depend on the active topic, confirmed facts and missing information that matters. Contact details are only appropriate later if the customer chooses a next action that needs them. Age, income, employment and similar details are requested only when relevant; gender is not requested without a verified requirement. Old sessions at the contact gate migrate to open discovery.
- Product buttons, age/budget discovery and preference changes use the conversation. No mandatory scenario editor or age/premium form is shown. Short age answers resolve the preceding age question. Existing confirmed insurance details remain available to the advisor.
- Login uses username and password checked by POST /api/auth/login. Temporary default credentials live only in server/customer.mjs, are shared separately with the workspace owner, and are never embedded in browser JavaScript or shown on the login screen. ART_LOGIN_USERNAME and ART_LOGIN_PASSWORD optionally override them through server environment variables. This is temporary authentication, not an ART customer-system integration.
- Successful login creates an HttpOnly, SameSite=Strict cookie bound to the in-memory session. Failed attempts are limited by client IP. No invented persona, customer profile or policy is loaded. Existing-policy help uses the same login; a signed-in customer is not asked to log in again.
- Distinct user and advisor profile icons appear on each message. English/Arabic switching preserves the conversation and RTL layout. Development banners, mode strips, response origin labels and curated starting-point paths are removed.

## Evidence and service boundaries

Motor comparison uses the official ART overview at https://www.alrajhitakaful.com/en/ar/personal/car-insurance, retrieved 6 November 2026. The page gives no publication date. Wafi Basic, Wafi Smart and Comprehensive are compared qualitatively. Premiums, deductibles, final eligibility and full policy exclusions require confirmation. Prices are never fabricated.

The life catalogue retained for internal calculation regression tests is unapproved planning data. The customer interface presents generic protection and savings approaches, with Quote required, rather than representing catalogue names and formula premiums as actual ART offers. Model instructions enforce the same distinction. Verified live policy records, approved life terms, underwriting prices, quote submission, advisor handoff and external market feeds require production adapters.

Quote/advisor confirmation currently saves a request in the browser session; the screen states accurately that nothing has been sent. Removing development labels does not turn an unconnected service into a connected one. No external submission occurs.

## Modules and endpoints

- src/chat.js, src/experience.js, src/styles.css: conversation, entry/login, inline activity and responsive layouts.
- src/advisory-client.js: NDJSON stream client; src/advisory.js: request lifecycle and minimum response-display duration.
- server/onboarding.mjs: open-ended guest entry with no contact collection.
- server/customer.mjs: backend credential verification and session binding.
- server/orchestrator.mjs, server/advisor.mjs, server/motor.mjs: isolated product context, source retrieval, tool orchestration and recommendations.
- server/openai.mjs, server/config.mjs: secure configurable OpenAI transport and environment loading.
- POST /api/session/guest: begin an open-ended guest conversation.
- POST /api/auth/login: validate username/password; never returns credentials or invented policies.
- POST /api/advice: streamed, intent-led insurance guidance.
- POST /api/tools: validated deterministic calculations.
- GET /api/config: non-secret effective mode/model metadata.

## Verification

npm run test:server runs backend, calculation, API and security regressions. npm run test:browser runs the current conversational browser suite and saves desktop/mobile screenshots. npm run test:live-rendering exercises live-mode transport using a synthetic provider, without a paid OpenAI call. npm test runs all three.

Browser checks cover open-ended guest discovery, contextual lifecycle labels, processing position and duration, removal of forms/retired copy, backend login, credentials never shown or stored, logged-in existing-policy help, motor context and budget changes, Arabic age/budget discovery, mobile overflow and RTL. Browser runners create isolated local test servers and do not call the configured live model. A credentials fixture is added only by the isolated browser-test runner; the application server has no such endpoint.

Reports and screenshots are in tests/artifacts. The current backend and browser suites replace older assertions about questionnaire forms and persona selection. No paid OpenAI request was needed for verification.

Verification results are recorded in tests/artifacts. Current suites cover open guest entry, contextual probing, real lifecycle descriptions, session isolation, login and bilingual mobile chat.

## Focused response refinement

Advice is now response-only: no automatic customer-summary, quote or replacement recommendation sections. Replies support safe emphasis, compact bullet icons and a subtle reveal animation with reduced-motion support. Open guest entry and backend-driven processing messages remain unchanged. Budget comparisons use the existing life planning calculator, at the same coverage and term, to find up to three eligible planning estimates within plus/minus 10 percent of the confirmed monthly budget; nearest comes first. These are not actual insurer premiums. Motor premiums are not connected, so motor alternatives are compared by benefits without a fabricated price fit.

## Number-verification removal

The conversation no longer checks model-generated numbers against a product-data whitelist or withholds replies for failing that check. The retired verification message is removed from backend errors, translations and restored customer chat history. A regression covers a 1993 birth-year answer after an age question. Input and response-shape validation remain separate. This change does not alter the current response-only layout, OpenAI credentials or price-calculation tools.

## Run frontend and backend together in Docker

The application already uses one Node server for static frontend files and /api routes. The Dockerfile packages that existing server with Node 24, runs as the non-root node user, and exposes container port 4173. No frontend build, npm install, second server or Nginx container is needed.

From the workspace root:

```sh
docker build -t himaya ./art-insurance
docker run --rm --init --name himaya -p 8080:4173 --env-file ./art-insurance/.env -e HOST=0.0.0.0 -e PORT=4173 himaya
```

Open http://localhost:8080. Frontend and backend share that origin, so the frontend's relative API URLs continue to work. Port 8080 avoids conflicting with a locally running copy on port 4173. Use Linux containers with Docker Desktop on Windows.

The .dockerignore excludes .env, secret variants, tests, browser profiles and local scripts from the build context. The Dockerfile copies only runtime files. Supply the OpenAI key and existing model settings at runtime using --env-file; no credentials are placed in the image or build arguments. Explicit HOST and PORT flags ensure a local-only setting in .env does not prevent Docker port publishing. Your private .env file is not modified.

For a public domain behind an HTTPS reverse proxy, also pass -e APP_ORIGIN=https://your-domain.example. Forward the original Host header and stream API responses without response buffering. Only that explicitly configured public origin is added to the existing localhost host checks; unrelated origins remain blocked. APP_ORIGIN is unnecessary for the localhost command above. HOST defaults to 127.0.0.1 outside Docker.

The container health check calls the local /api/config endpoint and makes no OpenAI requests. docker stop himaya stops the container. Sessions and saved server state remain in memory and reset when the container restarts. Optional local data-file paths must refer to files inside the container (mount approved data and override those environment variables if needed).

Docker command reference: https://docs.docker.com/reference/cli/docker/container/run/#env. Image build execution requires a Docker Engine; it was not available in this workspace during preparation.
