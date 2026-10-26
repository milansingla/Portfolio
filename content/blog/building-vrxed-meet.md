---
title: "Building VRxED Meet: Engineering a Browser-Based Meeting Experience"
slug: building-vrxed-meet
description: "A source-backed case study of VRxED Meet: its browser client, Supabase boundaries, Daily rooms, meeting access flow, and remaining trade-offs."
publishedAt: 2026-10-26
author: Milan Singla
tags: [software-engineering, real-time-systems, web-development, edtech, system-design]
published: true
---

## Why I built VRxED Meet

Online teaching and healthcare training need more than a generic video-call link. A participant may need to reach a room without installing software, join with a controlled access code, follow a conversation across language barriers, and use the same meeting workflow on a normal browser.

VRxED Meet is my browser-based meeting panel for that setting. The public project describes it as a meeting solution for medical education and healthcare training, with live translation and browser-based video conferencing. This article is based on the public repository's README, its built JavaScript client, and the project interface available with this portfolio. The repository is a production frontend build, not the original application source, so I distinguish what the client visibly does from what its server-side integrations must provide.

## What the public build verifies

The application is a React single-page application. Its visible product surface includes:

- email-based sign-in and account creation;
- a meeting route that accepts a room code;
- an invalid or expired-code state;
- browser video and audio controls;
- participant state updates;
- host controls for muting participants, locking cameras, locking microphones, and locking screen sharing;
- screen sharing and meeting chat controls;
- a transcript panel and translation-related controls; and
- an end-meeting action for the host.

The README also describes live translation in 50+ languages and identifies BioMistral as the model behind its medical translation and transcription. Those are product and project claims in the repository documentation. The compiled frontend confirms the translation and transcript experience, but it does not contain the model-serving implementation, training data, or a measurement of translation quality. I therefore do not present those details as independently verified backend behavior.

## Architecture: a browser client at several service boundaries

The repository is deliberately small because it contains the optimized frontend output rather than a full monorepo. The bundle identifies React, Supabase's browser client, and Daily's browser SDK. The resulting architecture can be described like this:

```text
Participant browser
        |
        v
React meeting SPA
   |         |             |
   |         |             +--> Browser media and speech APIs
   |         |
   |         +----------------> Daily room / Daily browser SDK
   |
   +--------------------------> Supabase Auth, data, and realtime
                                      |
                                      +--> meeting-token function
                                      +--> room-code records
                                      +--> meeting events and state
```

The browser owns the interface and the local meeting controls. Supabase provides the authentication and application-data boundary visible in the client. Daily provides the real-time meeting transport rather than requiring VRxED Meet to implement its own WebRTC signalling and media infrastructure. A server-side token function is called before the Daily meeting is entered; the public bundle labels this integration `daily-meeting-token`.

This boundary is the main architectural trade-off. The product can focus on meeting access, medical-education workflow, host policy, and translation UX while specialised providers handle authentication, persistence, and media transport. In exchange, availability and behaviour depend on those providers and on the server-side functions that are not included in the public build.

## Following a meeting from link to room

### 1. Authenticate when the product requires it

The client contains sign-in and sign-up flows backed by Supabase Auth. It reports distinct states for invalid credentials, an already registered email, and a successfully created account. This is a more useful boundary than treating the meeting page as a collection of unauthenticated buttons: the application can establish a user identity before it applies meeting policy.

### 2. Validate the room code

The meeting page receives a room name or code and checks it before rendering the meeting controls. The client has explicit states for a room that cannot be found and a code that is invalid or expired. It also stores a successful room-access result in session storage, which lets the current browser session move through the access gate without repeatedly asking for the same code.

The bundle refers to `room_codes` records and includes a deactivation path. That is evidence of an application-level room-code model, not proof that the code alone is a complete authorization system. The server-side policy and database rules are outside this repository, so the article cannot claim more than the public client establishes.

### 3. Obtain a meeting token

After access is accepted, the client requests a Daily meeting token through the `daily-meeting-token` integration. The token exchange is important: the browser should receive a scoped meeting credential rather than a provider secret. The client exposes separate error states for failure to fetch the token and for token acquisition with transcription enabled.

Daily's browser SDK then manages the real-time room connection. The client listens for events such as `joined-meeting`, `left-meeting`, `participant-joined`, and `participant-left`, and updates the interface as participant state changes. This is a provider-backed meeting lifecycle, not a custom media server hidden inside the static site.

### 4. Apply host policy during the room

The meeting interface distinguishes ordinary participant controls from host controls. A host can mute all participants, turn cameras off, lock microphones, lock cameras, and lock screen sharing. The client applies the corresponding Daily participant updates and reports the resulting state in the interface.

That design keeps a useful separation between intent and transport. A host action is expressed as a meeting policy, while Daily supplies the participant and media primitives. The remaining limitation is that the public bundle cannot show how host identity is checked on the server or how those policies are persisted across a reconnect.

### 5. Leave or end the meeting

Participant departure is represented explicitly in the client, and the host has an end-meeting action. The application also handles a participant's media state changing independently of the page's main navigation. These event-driven updates are preferable to assuming that the browser's current React state is the whole meeting state.

The public artifact does not expose a complete retention policy for rooms, transcripts, or recordings. The interface contains recording-related status messages, but that is not enough evidence to claim a recording storage pipeline or a particular privacy guarantee.

## Translation and transcription at the product boundary

Translation is one of the parts that makes VRxED Meet different from a generic meeting shell. The interface includes a list of supported languages, translation error handling, transcript visibility, and speech-related browser behaviour. The README attributes the medical translation and transcription model to BioMistral and describes 50+ supported languages.

The engineering lesson is to keep this capability at an integration boundary. The meeting client can present language selection, transcript state, and errors without embedding model execution in every participant's browser. The public build does not reveal the server endpoint, model deployment, prompt design, or evaluation data, so those details remain open implementation questions rather than claims in this case study.

## Static hosting is part of the application

VRxED Meet is packaged for static hosting. The repository includes `index.html`, hashed assets, a `404.html` fallback, and a small redirect mechanism that restores the original path after a static host sends an unknown route to the fallback page. This matters for meeting links: a shared route must survive a full page load, not only client-side navigation from the home page.

The approach is intentionally pragmatic. It works with hosts that can serve static files and redirect missing paths, but it also means routing behaviour depends on the host's fallback configuration. A more server-aware deployment could make route handling more direct; the static fallback keeps deployment simple and portable.

## Engineering challenges and trade-offs

### Real-time state without owning the media stack

**Problem:** A meeting UI must reflect joins, departures, media changes, and host restrictions while media transport is inherently asynchronous.

**Approach:** VRxED Meet uses Daily's browser SDK and reacts to named meeting and participant events. Supabase remains the application-data boundary instead of becoming a replacement for the media transport.

**Trade-off:** The product avoids implementing WebRTC infrastructure, but it inherits Daily's SDK, room, and token semantics. The public repository does not include enough operational evidence to describe its retry or availability strategy.

### Access codes versus meeting authorization

**Problem:** A shareable meeting experience needs a join flow, but a code-validation screen should not be confused with complete authorization.

**Approach:** The client validates room-code records, handles missing and expired codes, and obtains a provider token only after the access step.

**Trade-off:** The security boundary ultimately depends on the server-side validation, database policies, and token function. Those are not present in the compiled repository, so the implementation should be reviewed there before making stronger authorization claims.

### Provider integrations and failure states

**Problem:** A failed token request, invalid room, translation error, or interrupted connection should not look like a blank meeting screen.

**Approach:** The client includes specific user-facing states for invalid rooms, expired codes, token failures, translation failures, and participant lifecycle changes.

**Trade-off:** These states improve diagnosis at the UI boundary, but they do not prove that every backend failure is retried or recoverable. Those behaviours require source and deployment evidence that is not included in this repository.

### Static deep links

**Problem:** A meeting path can work during in-app navigation and still fail when a participant opens it directly.

**Approach:** `404.html` forwards the original path to the root, and `index.html` restores it with the History API before the React application starts.

**Trade-off:** This makes the build portable across static hosts, while requiring the host to serve the fallback correctly and making redirects part of the route lifecycle.

## What I learned

The most useful lesson from VRxED Meet is that a real-time product is a coordination problem before it is a video component. The room code, authentication state, provider token, participant events, host policy, and translation state all have to meet at the right boundary.

It also reinforced the value of saying exactly what an artifact proves. The public build demonstrates a browser meeting experience and its integration points. It does not, by itself, prove model accuracy, production scale, continuous monitoring, recording retention, or end-to-end encryption. Keeping those distinctions visible makes the engineering story more credible and gives the next iteration a concrete checklist.

## Next improvements

The next engineering steps would be to make the server-side contracts public and testable: document the room-code authorization rules, define the token function's expiry and participant scope, add explicit reconnect and degraded-network behaviour, and publish tests for host-policy enforcement. Translation would benefit from a documented evaluation set focused on medical terminology and from clear disclosure of what is stored in transcripts.

Those improvements would not change the core architecture. They would make its boundaries easier to audit, operate, and evolve while preserving the simple browser join experience that VRxED Meet is designed to provide.
