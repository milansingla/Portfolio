---
title: "Building Termedu: Engineering a Modern Learning Management Platform"
slug: termedu
description: "A source-backed case study of Termedu, covering its learning platform, web and Android clients, integrations, engineering trade-offs, and next steps."
publishedAt: 2026-10-25
author: Milan Singla
tags: [software-engineering, full-stack-development, edtech, system-design]
published: True
---

## Why I built Termedu

Learning platforms often look simple from the outside: a student signs in, opens a course, watches a lesson, and submits an assignment. The engineering is in connecting those steps into one dependable experience for students, lecturers, and administrators.

Termedu is my attempt to build that experience as a full-stack learning management system. The platform brings together course access, progress tracking, assignments, project submissions, live classes, notifications, and an Android companion app. I served as Tech Lead while building it, which meant thinking about both the product surface and the boundaries between the systems behind it.

This article describes what is verifiable from the public Termedu-LMS and Android repositories and the project materials available with the portfolio. It intentionally avoids claims about user counts, performance, or production readiness that are not supported by that evidence.

## The product surface

The web platform is organised around the normal rhythm of a course. Students can browse a course catalogue, use a video player with progress tracking, work through assignments, and submit projects. Role-based access separates the capabilities of students, lecturers, and administrators rather than treating every signed-in user as equivalent.

The platform also extends beyond recorded content. Live classes are provided through Daily.co, and an AI-assisted entrance examination uses Google Gemini. Firebase Cloud Messaging provides push notifications, so important events do not have to wait for a student to reopen the website.

The Android application is a companion rather than a separate learning product. Its package is `in.termedu.app`, and it presents the Termedu web platform in a native Android application written in Java. It adds mobile-specific integration points including deep links, course-material and assignment file transfers, and lock-screen media controls. Push notifications use Firebase Cloud Messaging, with UnifiedPush available as an alternative.

## Architecture: one platform, several clients

The web application uses a React 19 single-page client and a Node.js and Express API. Supabase provides the PostgreSQL-backed data layer. This gives the browser a focused application API while keeping persistence and access decisions on the server side.

The main request and integration flow looks like this:

```text
Student or lecturer
        |
        v
React 19 web client <------> Node.js / Express API
        |                              |
        |                              v
        |                         Supabase / PostgreSQL
        |
        +---- Daily.co for live classes
        +---- Google Gemini for the AI-assisted entrance exam
        +---- Firebase Cloud Messaging for push notifications

Java Android companion app
        |
        +---- presents the Termedu platform and handles mobile integrations
```

This is a deliberately pragmatic architecture. The client is responsible for presenting the learning workflow, while the API is the integration boundary for data and external services. PostgreSQL gives the application relational structure for users, courses, progress, assignments, and submissions without requiring each feature to invent its own storage model.

The public evidence does not establish a microservice topology, a particular deployment provider, or continuous monitoring guarantees, so I am not presenting Termedu as more distributed than it is. That restraint is important in a case study: a list of technologies is not the same thing as proof of an operational architecture.

## Designing the learning workflow

The most important design choice was to treat learning as a connected workflow instead of a collection of isolated pages. Course access leads to content; content produces progress; assignments produce submissions; and the same user and role model governs who can create, review, or manage each part.

Progress tracking is particularly useful because it turns a video player into part of the course model. The application can associate a student's activity with a course rather than leaving completion as a purely local browser state. Assignments and project submissions follow the same principle: they are durable records in the platform, not just temporary form interactions.

Role-based access is another foundational boundary. Students, lecturers, and administrators need different actions even when they use the same application. Keeping those roles explicit makes it possible to reason about permissions at the API boundary and keeps the client from being the only place where a button is hidden.

There are trade-offs to this approach. A central API is easier to understand and evolve than several independently deployed services, but it also becomes an important coordination point. Changes to authentication, course data, or submissions need to remain compatible with both the web client and the Android application.

## Integrations without hiding the boundaries

Termedu relies on specialised services where they provide a clear capability:

- **Daily.co** handles live classes, avoiding the need to implement a complete real-time video system inside the learning platform.
- **Google Gemini** supports the AI-assisted entrance examination.
- **Firebase Cloud Messaging** delivers push notifications to the Android application and platform users.
- **Supabase** provides the PostgreSQL-backed persistence layer.

The benefit is focus. Termedu can concentrate on course and assessment workflows while using providers for communication, messaging, and AI functionality. The cost is dependency management: authentication, failures, quotas, provider changes, and user experience all cross a system boundary.

That makes the API especially important. External integrations should be coordinated by server-side application logic rather than exposing provider credentials or turning the browser into the source of truth for access. The available public material confirms these integrations, but it does not provide enough evidence to claim a particular retry policy, availability target, or end-to-end security guarantee.

## The Android companion

The Android app reflects a practical product decision: learners may want the platform to feel native on a phone even when the core experience is the web platform. A Java application can provide Android entry points, notification handling, file transfer, deep linking, and media controls while allowing the learning interface to remain shared.

This reduces duplicated course functionality, but it also creates a boundary that needs careful testing. A link opened from a notification should reach the right platform destination. A downloaded course file should behave like a mobile file rather than a browser-only response. Media controls should remain understandable when the application is not in the foreground.

The companion approach is therefore a trade-off between reuse and native integration. It avoids maintaining a completely separate Android learning client, while still acknowledging the capabilities students expect from a mobile application.

## Engineering challenges and trade-offs

### Keeping permissions meaningful

The same platform serves students, lecturers, and administrators. The challenge is not just implementing three labels; it is ensuring that each role maps to appropriate course, assignment, and administrative actions. Explicit role-based access is the verified approach, but the public repositories do not document a complete threat model or independent security audit.

### Joining asynchronous services to a synchronous workflow

Live classes, AI-assisted examinations, and push notifications do not behave like ordinary database reads. They can be delayed, unavailable, or governed by provider-specific states. Keeping these services behind the application boundary makes the product easier to reason about, but it means the API needs to represent integration failures clearly instead of pretending every request is local.

### Sharing the platform with Android

The Android app needs to participate in the same authentication and content workflow while supporting mobile behaviours such as deep links, file handling, and lock-screen controls. A companion application limits duplicated product logic, but it makes compatibility between the web platform and mobile shell an ongoing responsibility.

### Making progress and submissions durable

Video progress, assignments, and project submissions represent different kinds of state. They still need to belong to the correct user and course and remain available across sessions and devices. Using a relational backend gives those records a durable home, while the application has to preserve the relationships as the product grows.

## What I learned

The biggest lesson from Termedu is that an education product is a coordination problem. The video player is only one part of the experience. Authentication, roles, progress, submissions, live sessions, notifications, and mobile entry points all have to agree about the same user and course.

I also learned to be deliberate about provider boundaries. External services can accelerate development, but they do not remove the engineering work. The platform still needs clear ownership of permissions, durable state, and user-facing errors.

Finally, the Android companion reinforced the value of a shared core workflow. Reusing the web platform makes feature development more manageable, while native integrations can be added where they materially improve the mobile experience.

## What I would improve next

The next improvements should be driven by evidence from real usage and operational observation. I would prioritise stronger automated coverage across role permissions, progress updates, submissions, deep links, notification routes, and provider failure states. I would also add clearer observability around live-class creation, AI-assisted examination requests, and notification delivery.

Other useful follow-up work would include documenting the API contract between the web client and Android application, defining recovery behaviour for unavailable integrations, and testing file-transfer flows on a wider range of Android devices. Those are future improvements, not features I am claiming already exist.

Termedu is ultimately a project about connecting familiar learning actions into one system. The engineering value is in those connections: a course has progress, progress belongs to a student, assignments have submissions, live classes have access rules, and the same platform needs to work in a browser and on a phone. Building it made those boundaries visible—and gave me a much clearer understanding of the work required behind a seemingly simple learning experience.
