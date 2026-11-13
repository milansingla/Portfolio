---
title: "LLM Chatbots Are Killing Hackathons and Technical Interviews"
slug: llm-chatbots-killing-hackathons-interviews
description: "AI has made software easier to assemble and harder to evaluate. What should hackathons and technical interviews measure now?"
publishedAt: 2026-11-13
author: Milan Singla
tags: [software-engineering, artificial-intelligence, developer-tools, technical-interviews, hackathons]
published: false
---

There is a familiar hackathon scene now: a team opens its demo, the interface is polished, the API responds, the README is unusually complete, and the judges have five minutes to decide what they are looking at.

The uncomfortable question is not whether the project works. It is: how much of the engineering does the team understand?

That question used to be easier to answer. A short deadline still forced participants to choose what to build and what to leave unfinished, but writing the software created a visible trail of decisions. Today, ChatGPT, Claude, Gemini, GitHub Copilot, Cursor, and coding agents can generate a project structure, wire up an API, produce a frontend, write tests, and explain the result before the coffee gets cold.

This is not proof that every AI-assisted project is shallow. It is proof that the final demo has become a weaker proxy for the person behind it.

## When building software became dramatically faster

AI coding tools are not just autocomplete with better branding. They can turn a rough product idea into a sequence of plausible implementation steps. Ask for a React dashboard with authentication, a database schema, an API layer, and deployment instructions, and an assistant can produce enough scaffolding to make a blank repository look alive.

There is real productivity evidence behind the excitement. In a controlled experiment, [Peng and colleagues reported that developers with GitHub Copilot completed a JavaScript HTTP-server task 55.8% faster](https://arxiv.org/abs/2302.06590). A later set of field experiments across Microsoft, Accenture, and another large company reported a [26.08% increase in completed tasks across 4,867 developers](https://economics.mit.edu/sites/default/files/inline-files/draft_copilot_experiments.pdf). Those results are meaningful, but they are not a universal conversion rate for “AI makes programmers 26% better.” They measure particular tools, tasks, workplaces, and definitions of productivity.

The practical lesson is still important: refusing to acknowledge AI-assisted development would make an evaluation less like the job many engineers will actually do.

But faster implementation creates a second problem. When the cost of producing code falls, code volume and visual polish tell us less about the engineer who produced them. A candidate can assemble a credible architecture without having formed a durable mental model of it. A participant can generate an onboarding flow without knowing which data is trusted, which route is public, or what happens when the happy path breaks.

The code can be real. The understanding can still be missing.

## The new hackathon problem

Hackathons have always rewarded more than programming. They reward finding a useful problem, narrowing scope, making trade-offs, presenting clearly, and shipping under pressure. AI does not erase those skills. It changes their relative weight.

A participant can now ask an assistant to:

- create the initial repository and folder structure;
- generate a responsive interface from a description;
- write CRUD endpoints and database models;
- connect an authentication provider;
- add a chatbot or summarisation feature;
- create seed data, tests, and setup instructions; and
- turn the implementation into a polished demo script.

That can be excellent engineering when the participant is directing the work, checking assumptions, testing the output, and taking responsibility for the result. It can also create the appearance of engineering ability when the participant is mainly accepting plausible output.

This is where judging criteria matter. If judges have time only to watch a demo and skim a README, the project that looks complete has an advantage over the project with deeper but less visible engineering. The bias is not necessarily malicious. A working interface is easier to evaluate than an unglamorous decision about data integrity or failure recovery.

AI can amplify that bias because it makes surface area cheap. A team that spends its time on accessibility, observability, or a careful domain model may look less impressive than a team that generates ten screens and a confident pitch. The manual team is not automatically more capable, and the AI-assisted team is not automatically less original. The problem is that the judging format may not distinguish product polish from technical ownership.

Some organisers are already adapting. The rules for a [2026 Devpost Multimodal AI Hackathon allow AI coding assistants but require disclosure](https://multimodal-ai-hackathon-2026-7.devpost.com/rules), and say participants remain responsible for their submissions and should be able to explain their code. Another [GenAI Dev Hackathon makes functionality, original intent, disclosure, and a technical audit explicit](https://genaidevhackathon.devpost.com/rules). These are sensible moves because they do not pretend AI can be uninvented. They make the workflow part of the submission instead.

The hard question is whether disclosure alone is enough. “Built with Claude and Copilot” tells a judge what tools were present, not whether the team understood the resulting system. A stronger submission would include a short architecture note, a record of meaningful decisions, a failure case, and a live explanation of one non-trivial path through the code.

## The technical interview credibility crisis

Technical interviews face the same problem with higher stakes. A take-home assignment can now be completed with an AI assistant that generates the first version, reviews its own code, writes tests, and suggests improvements. A live coding question can be solved by a candidate who quietly consults a chatbot, unless the environment prevents it. A portfolio project can be impressive and still be mostly unexplained machinery.

That makes the old question — “Can this person write code from memory under pressure?” — less useful than it already was.

Traditional data-structures-and-algorithms interviews are not worthless. They can test reasoning about constraints, communication, and the ability to make progress with an unfamiliar problem. They are also convenient to standardise. But solving a memorised puzzle without tools is not the same as debugging a failing service, navigating an existing codebase, choosing an API boundary, or deciding what not to build.

The opposite extreme is not better. If a company lets an assistant generate everything and evaluates only whether the tests pass, it may hire someone who can produce a demo but cannot maintain it. The interview has then measured tool orchestration without measuring technical judgment.

Companies are beginning to choose different answers. In [Canva's description of its AI-assisted interviews](https://www.canva.dev/blog/engineering/yes-you-can-use-ai-in-our-interviews/), candidates for several engineering roles are expected to use tools such as Copilot, Cursor, or Claude. Canva says the process still evaluates fundamentals, judgment, and ownership of the submitted code. At the other end, [Red Hat's candidate guidance](https://www.redhat.com/en/jobs/ai-usage-guidelines) says AI is not allowed in business or panel interviews, while some technical interviews may allow it if the candidate confirms the policy and discloses the tool.

Neither policy is automatically correct for every role. A team hiring someone to work in an AI-assisted environment may reasonably want to observe that workflow. A company trying to measure unaided fundamentals may reasonably run a constrained round. The failure is ambiguity: candidates should not have to guess whether using the same tool they will use at work is considered initiative or misconduct.

## Who deserves the credit?

If AI writes most of the code, who built the project?

The answer cannot be “the human did nothing.” Choosing the problem, specifying the constraints, deciding which output to keep, integrating it with existing systems, and accepting responsibility for failures are all engineering work. An experienced developer who can direct an assistant through a difficult codebase may be more effective than someone who insists on typing every line manually.

But the answer also cannot be “the prompt is the product.” A generated component is not an architectural decision merely because it compiles. A prompt is not a test plan. A plausible explanation is not evidence that the author can debug the system when the model is wrong.

The relevant distinction is between **using AI as an engineering tool** and **using AI to create the appearance of engineering ability**.

The first looks like this:

- the engineer can describe the intended behaviour before asking for code;
- generated code is reviewed against requirements and existing conventions;
- tests, logs, and runtime behaviour are used to challenge the assistant's assumptions;
- the engineer can explain trade-offs and identify what remains uncertain; and
- responsibility for security, reliability, accessibility, and maintenance stays with the human.

The second looks like this:

- the system is accepted because it looks complete;
- errors are repaired by repeatedly pasting them into a chatbot;
- the author cannot explain data flow, dependencies, or failure modes;
- documentation describes capabilities the implementation does not have; and
- the person treats model confidence as a substitute for verification.

This is not an argument for romanticising manual coding. Manually typed code can be careless, copied, or misunderstood too. AI simply makes the gap between authorship and understanding easier to hide.

## What should we evaluate instead?

Hackathons and interviews do not need to choose between banning AI and giving it unlimited authority. They can evaluate the parts of engineering that remain essential when code generation is cheap.

### 1. Evaluate the decision, not just the artifact

Ask why the participant chose a particular data model, API boundary, library, or deployment approach. A short explanation of rejected alternatives often reveals more than another generated feature.

### 2. Add a change request

After the demo, change a requirement. Add an access rule, alter the data shape, introduce a failure, or ask for a new constraint. Someone who understands the system can adapt it. Someone who only rehearsed the happy path will usually reveal the boundary of their understanding quickly.

### 3. Test debugging and diagnosis

Give candidates a failing test, an unfamiliar repository, or an incorrect AI-generated patch. Real engineering includes identifying the actual cause, not just producing a first answer. Debugging also makes it possible to allow AI while still observing judgment.

### 4. Require a clear AI disclosure

Disclosure should include which tools were used, for what parts of the work, and what the participant personally verified. This is not a demand for a surveillance log. It is a way to make the development process part of the evidence.

### 5. Separate dimensions of quality

Judges and interviewers should score problem selection, correctness, usability, technical depth, explanation, and iteration separately. A beautiful interface should not compensate for an insecure access model, and a clever prompt should not compensate for an inability to explain the resulting code.

### 6. Let the rules match the job

For an AI-native role, banning AI can measure a skill the team does not actually need. For a course assessment or a fundamentals round, unaided work may still be useful. The right question is not “Is AI allowed?” in isolation. It is “What capability is this stage intended to measure, and does the tool change that measurement?”

## What this means for the next generation of developers

Beginners may benefit enormously from AI. An assistant can explain an error in several ways, provide a small example, or help a learner move past repetitive setup. That does not make learning automatic. If the learner never predicts what the code should do, tests it, or tries to explain it without the assistant, speed can become a very efficient way to avoid understanding.

For experienced engineers, the value is different. AI can remove boilerplate and create more room for product thinking, investigation, and review. But seniority makes verification more important, not less. The wider the system's blast radius, the less acceptable it is to trust code because it sounds reasonable.

The emerging skill is not simply prompt writing. It is problem framing, context selection, output evaluation, integration, and accountability. An engineer needs to know when a generated answer is locally correct but architecturally wrong; when a test proves too little; when a dependency creates a security or licensing risk; and when the best implementation is to delete the feature.

That is a higher bar than writing every line manually. It is also a bar that a demo-only evaluation cannot reliably measure.

## The uncomfortable conclusion

LLM chatbots are not killing hackathons and technical interviews because they make coding effortless. They are exposing how often those formats confused a visible artifact with the capability to produce and maintain it.

The answer is not to pretend AI is cheating by definition. It is not to give every generated project the same credit as original engineering without asking harder questions. It is to redesign evaluation around understanding, judgment, iteration, and responsibility.

The next time a project looks remarkable, the useful question is no longer only, “What did you build?”

It is: **“Show me what you would change, explain why it works, and tell me where it will fail.”**

