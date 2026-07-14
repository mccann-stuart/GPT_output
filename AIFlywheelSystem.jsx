import React, { useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_SETTINGS = {
  layer: "models",
  scenario: "support",
};

const TERM_DETAILS = {
  pretraining: {
    label: "Pretraining",
    short: "The first, broad learning phase: a model predicts missing or next pieces of data across a very large dataset.",
    plain: "Imagine reading a huge library and repeatedly guessing the next word. Each corrected guess slightly reshapes the model’s internal map of language, facts and patterns.",
    example: "A model sees millions of examples of code, prose, tables and images before it is adapted to a particular job.",
    watch: "More data only helps when it is relevant, lawful, well filtered and sufficiently diverse. Volume is not the same as quality.",
  },
  "post-training": {
    label: "Post-training",
    short: "The adaptation phase after broad pretraining, used to make behaviour more useful, safe and task-aware.",
    plain: "Pretraining gives the model raw capability. Post-training teaches it how to use that capability: follow instructions, prefer better answers and avoid harmful ones.",
    example: "Reviewers rank two draft answers; those preferences become a signal that nudges future answers towards the better style.",
    watch: "Optimising for a narrow score can make the model sound compliant without making it genuinely more correct.",
  },
  rlhf: {
    label: "RLHF",
    short: "Reinforcement learning from human feedback: people’s preferences become a reward signal for model behaviour.",
    plain: "Humans compare model answers. A separate system learns what those humans prefer, then the model is trained to earn a higher preference score.",
    example: "Reviewers prefer an answer that is accurate, direct and cites uncertainty over one that is fluent but overconfident.",
    watch: "The result inherits the reviewers’ blind spots and the way the feedback task was framed.",
  },
  rlvr: {
    label: "RLVR",
    short: "Reinforcement learning from verifiable rewards: success is scored by an objective check rather than opinion alone.",
    plain: "The model tries a task and receives a reward when an external checker can prove the result is right.",
    example: "Code receives a positive reward only when it compiles and passes the hidden tests.",
    watch: "A checker can be gamed. Passing the test is valuable only when the test represents the real task.",
  },
  rlaif: {
    label: "RLAIF",
    short: "Reinforcement learning from AI feedback: another model supplies part of the critique or preference signal.",
    plain: "Instead of asking a person to judge every answer, an evaluator model applies a written rubric at scale. Humans still define and audit the rubric.",
    example: "An evaluator flags answers that omit a required safety caveat before the main model is updated.",
    watch: "An evaluator model can reproduce its own mistakes at scale, so human calibration remains essential.",
  },
  reasoning: {
    label: "Reasoning",
    short: "Extra computation used to decompose, test or search through a problem before returning an answer.",
    plain: "Rather than responding with the first plausible pattern, the system creates intermediate candidates, checks them and revises its route.",
    example: "A planning assistant tests several staffing schedules against constraints before presenting the best feasible option.",
    watch: "More steps can create more opportunities for error. Reasoning needs verification, not just length.",
  },
  verifiers: {
    label: "Verifiers",
    short: "Independent checks that score whether an answer obeys known rules or reaches a testable result.",
    plain: "A verifier is the examiner, not the student. It checks a candidate answer using tests, rules, calculations or a separate model.",
    example: "A finance workflow recomputes every subtotal and rejects an answer whose numbers do not reconcile.",
    watch: "Verification works best where correctness is observable. Some judgement-heavy tasks have no clean answer key.",
  },
  moe: {
    label: "Mixture of Experts (MoE)",
    short: "An architecture with specialised subnetworks, where only a small subset is activated for each input.",
    plain: "Think of a large firm with specialist teams. A router sends each question to a few relevant experts instead of involving everyone.",
    example: "A coding prompt may activate different internal experts from a poetry prompt, while both live in one model.",
    watch: "Routing and load balancing are difficult; unused experts add memory cost even when they save computation.",
  },
  "state-space": {
    label: "State-space model",
    short: "A sequence architecture that compresses prior information into a continually updated internal state.",
    plain: "Instead of repeatedly looking back at every earlier token, the model carries forward a compact running summary of what matters.",
    example: "Long sensor streams can be processed one reading at a time without revisiting the whole history.",
    watch: "Compression can lose details that full attention would retain, so architecture choice depends on the task.",
  },
  multimodal: {
    label: "Multimodal",
    short: "Able to work across more than one data type, such as text, images, audio or video.",
    plain: "The system connects different forms of evidence in one task rather than treating them as separate products.",
    example: "A field engineer photographs a damaged part, describes the noise and receives a repair procedure.",
    watch: "Each modality introduces different failure modes, privacy risks and evaluation needs.",
  },
  "test-time-compute": {
    label: "Test-time compute",
    short: "Extra processing spent while answering a request, rather than while training the model.",
    plain: "The model is already built. For a harder question, the system buys more thinking time: more candidate solutions, checks or search.",
    example: "A maths system generates 20 candidate proofs, verifies them and returns the strongest one.",
    watch: "It raises latency and cost; easy requests should not pay for hard-problem machinery.",
  },
  caching: {
    label: "Caching",
    short: "Reusing previously computed results instead of calculating identical work again.",
    plain: "A cache is a short-term memory for expensive work. If the same prefix or result appears again, the system retrieves it cheaply.",
    example: "A long, repeated system instruction is processed once and reused across thousands of support questions.",
    watch: "Stale or incorrectly shared cache entries can return the wrong result or leak data between users.",
  },
  batching: {
    label: "Batching",
    short: "Grouping several requests so hardware can process them efficiently together.",
    plain: "A bus moves more people per unit of fuel than separate taxis. Batching similarly fills the accelerator with useful work.",
    example: "A nightly document classification job processes hundreds of pages in parallel-sized groups.",
    watch: "Waiting to form a batch can add latency, so real-time products need careful scheduling.",
  },
  quantisation: {
    label: "Quantisation",
    short: "Representing model numbers with fewer bits to reduce memory use and speed up calculation.",
    plain: "It is like rounding measurements to fewer decimal places. The model becomes smaller and faster while trying to preserve useful accuracy.",
    example: "A 16-bit model is converted to 8-bit or 4-bit values so it can run on cheaper hardware.",
    watch: "Too much rounding damages quality, especially on sensitive or unusual tasks.",
  },
  "dynamic-routing": {
    label: "Dynamic routing",
    short: "Choosing a model, tool or workflow at request time based on the job’s difficulty and risk.",
    plain: "Not every parcel needs an armoured truck. A router sends routine work to a fast, cheap path and escalates harder work.",
    example: "Simple FAQ queries use a small model; contractual disputes are routed to a stronger model and a human reviewer.",
    watch: "Bad routing silently reduces quality. Escalation rules need monitoring against real outcomes.",
  },
  retrieval: {
    label: "Retrieval during inference",
    short: "Looking up relevant external information while producing an answer, often called retrieval-augmented generation or RAG.",
    plain: "The model does not need every fact stored inside it. It searches an approved knowledge source, reads relevant passages and answers from them.",
    example: "A policy assistant retrieves the current refund rules and links the exact clauses used in its answer.",
    watch: "The answer cannot be better than the retrieved evidence. Permissions, freshness and citations are core product features.",
  },
  context: {
    label: "Context",
    short: "The information made available to the model for the current request.",
    plain: "Context is the model’s working desk: instructions, conversation, documents, tool results and other evidence placed in view.",
    example: "A sales assistant receives the customer record, product catalogue and the last three emails before drafting a reply.",
    watch: "More context is not always better. Irrelevant or malicious content can distract or manipulate the system.",
  },
  orchestration: {
    label: "Orchestration",
    short: "Coordinating models, tools, rules and human checkpoints into a dependable workflow.",
    plain: "The model is one musician; orchestration is the score and conductor deciding who acts, in what order and what happens on failure.",
    example: "Extract invoice data, validate totals, check the supplier, request approval, then post to the ledger.",
    watch: "Complex chains fail in more places. Each step needs clear state, timeouts, retries and ownership.",
  },
  memory: {
    label: "Memory",
    short: "Stored information carried across interactions so the application can retain useful state.",
    plain: "Unlike the model’s temporary context, application memory persists selected facts, decisions or progress for later use.",
    example: "A project copilot remembers the agreed deadline and preferred report format next week.",
    watch: "Memory creates privacy, consent, correction and deletion obligations. Store the minimum useful information.",
  },
  policy: {
    label: "Policy layer",
    short: "Explicit rules controlling what the application may do, when it must stop and who may approve an action.",
    plain: "Policy turns organisational boundaries into enforceable gates around a probabilistic model.",
    example: "The assistant may draft a refund under £100 but needs a manager to approve payment.",
    watch: "Policies must be enforced outside the prompt where possible; instructions alone are not a security boundary.",
  },
  apis: {
    label: "APIs",
    short: "Defined interfaces that let software systems request data or actions from one another.",
    plain: "An API is a controlled service counter: it states what can be requested, the required format and the response returned.",
    example: "An assistant calls a calendar API to find free slots and create an approved meeting.",
    watch: "Tool access converts words into actions. Authentication, least privilege and confirmation are critical.",
  },
  "state-management": {
    label: "State management",
    short: "Tracking what has happened, what is true now and what the workflow should do next.",
    plain: "State is the application’s bookmark. It prevents a multi-step job from forgetting which inputs were approved or repeating an action.",
    example: "A claims workflow records that identity is verified but payment still awaits review.",
    watch: "Retries and parallel actions can corrupt state unless updates are idempotent and carefully ordered.",
  },
  "app-rl": {
    label: "Application-level RL loop",
    short: "Improving the whole product workflow from observed outcomes, not only retraining the base model.",
    plain: "The product learns which prompts, tools, routes and checkpoints create better completed tasks, then adjusts those choices.",
    example: "Resolved support cases teach the router which requests need retrieval or human escalation.",
    watch: "Proxy metrics can reward shortcuts. Optimise for real user outcomes with safety constraints.",
  },
  proprietary: {
    label: "Proprietary data",
    short: "Information an organisation owns or controls and that competitors cannot freely access.",
    plain: "This is the organisation’s private operational history: documents, decisions, transactions and specialist knowledge.",
    example: "Past maintenance records reveal which fault patterns precede machine failure.",
    watch: "Ownership does not automatically permit every use. Contracts, privacy and retention rules still apply.",
  },
  crm: {
    label: "CRM",
    short: "Customer relationship management software: the system of record for accounts, contacts and commercial activity.",
    plain: "It is the shared address book and activity history for the customer relationship.",
    example: "The assistant reads account status and recent conversations before proposing a next action.",
    watch: "CRM data is often incomplete or stale; automation can amplify those errors.",
  },
  erp: {
    label: "ERP",
    short: "Enterprise resource planning software: the operational system for finance, supply, inventory and related processes.",
    plain: "An ERP is the organisation’s transaction backbone, connecting what was ordered, delivered, stocked and paid.",
    example: "A procurement assistant checks inventory and approved suppliers before drafting a purchase order.",
    watch: "ERP actions affect real money and stock, so write access requires strict controls and audit trails.",
  },
  synthetic: {
    label: "Synthetic data",
    short: "Artificially generated examples used to train, test or evaluate systems.",
    plain: "When real examples are rare or sensitive, a generator creates plausible cases with known answers or controlled variation.",
    example: "A fraud team generates unusual transaction patterns to test whether detection rules catch them.",
    watch: "Generated data can recycle model biases and miss the messiness of reality. Validate it against real distributions.",
  },
  gpus: {
    label: "GPUs",
    short: "Graphics processing units: chips that run many similar numerical operations in parallel.",
    plain: "AI training repeats enormous numbers of matrix calculations. GPUs provide thousands of small workers suited to doing them together.",
    example: "A cluster of GPUs trains or serves a large model across many linked machines.",
    watch: "The chip is only one bottleneck; memory, networking, power and software utilisation can dominate cost.",
  },
  tpus: {
    label: "TPUs",
    short: "Tensor processing units: specialised accelerators designed for machine-learning calculations.",
    plain: "A TPU is purpose-built for the mathematical patterns common in neural networks rather than general graphics work.",
    example: "Large training jobs map tensor operations across many interconnected TPU devices.",
    watch: "Specialisation can improve efficiency but may increase platform dependence and migration cost.",
  },
  asics: {
    label: "ASICs",
    short: "Application-specific integrated circuits: chips engineered for a narrow family of operations.",
    plain: "Where a general processor is a multi-tool, an ASIC is a purpose-built machine. It can be far more efficient at its chosen job.",
    example: "An inference accelerator is designed around the exact arithmetic and data movement models require.",
    watch: "Hardware takes years to design; a narrow bet can age badly if model architectures change.",
  },
  hbm: {
    label: "HBM",
    short: "High-bandwidth memory: stacked memory that feeds data to accelerators much faster than conventional memory.",
    plain: "A fast calculator is useless if it waits for numbers. HBM is the wide pipe keeping AI chips supplied with model data.",
    example: "Model weights are streamed from HBM into compute units during each generated token.",
    watch: "HBM is costly, capacity-constrained and closely tied to advanced packaging.",
  },
  nvlink: {
    label: "NVLink",
    short: "A high-speed interconnect used to move data directly between compatible accelerators.",
    plain: "When one model spans several chips, the chips must talk constantly. NVLink is a much wider, faster bridge than ordinary peripheral links.",
    example: "Adjacent GPUs exchange partial model calculations without routing everything through the CPU.",
    watch: "Performance depends on topology and software; a fast link does not remove every communication bottleneck.",
  },
  infiniband: {
    label: "InfiniBand",
    short: "A low-latency, high-throughput network widely used to connect machines in computing clusters.",
    plain: "NVLink connects nearby accelerators; InfiniBand is often the high-speed road system between servers.",
    example: "Hundreds of training servers synchronise model updates across an InfiniBand fabric.",
    watch: "Congestion, topology and configuration can leave expensive accelerators waiting for the network.",
  },
  "process-node": {
    label: "Process node",
    short: "A generation of chip-manufacturing technology, commonly described with a nanometre-class name.",
    plain: "Newer manufacturing processes generally fit more or better transistors into a given area, improving capability or efficiency.",
    example: "A new accelerator moves to a newer process to increase compute within its power envelope.",
    watch: "Node names are not directly comparable across manufacturers, and leading-edge capacity is scarce.",
  },
  packaging: {
    label: "Advanced packaging",
    short: "Techniques for combining compute, memory and other chiplets into one tightly connected system.",
    plain: "Modern performance comes from arranging several specialised pieces extremely close together, not only making one giant chip.",
    example: "An accelerator sits beside stacks of HBM on a shared interposer for very fast data movement.",
    watch: "Packaging capacity, heat and manufacturing complexity can constrain supply as much as wafer production.",
  },
  yields: {
    label: "Manufacturing yield",
    short: "The share of produced chips or packages that work correctly enough to sell.",
    plain: "If 100 units are made but only 70 pass testing, the yield is 70%. Higher yield lowers effective unit cost and expands supply.",
    example: "A packaging improvement reduces defects, making more complete accelerator modules usable.",
    watch: "Yield data is commercially sensitive and changes as a manufacturing process matures.",
  },
};

const LAYERS = {
  models: {
    number: "01",
    title: "Model gains",
    shortTitle: "Models",
    colour: "#f36b4f",
    summary: "Improve the model’s underlying capability before it enters a product.",
    question: "How does the intelligence itself get better?",
    features: [
      { lead: "Broader foundations", parts: ["Train on more useful, better-governed data through ", ["pretraining", "pretraining"], "."] },
      { lead: "More useful behaviour", parts: ["Shape behaviour through ", ["post-training", "post-training"], ", including ", ["RLHF", "rlhf"], ", ", ["RLVR", "rlvr"], " and ", ["RLAIF", "rlaif"], "."] },
      { lead: "Harder problem-solving", parts: ["Add ", ["reasoning", "reasoning"], ", search and independent ", ["verifiers", "verifiers"], "."] },
      { lead: "New architectures", parts: ["Use ", ["mixture-of-experts", "moe"], ", ", ["state-space models", "state-space"], " and ", ["multimodal", "multimodal"], " inputs."] },
    ],
    flywheel: ["Better models", "More useful answers", "More users", "More learning data"],
    lever: "Capability",
  },
  inference: {
    number: "02",
    title: "Inference gains",
    shortTitle: "Inference",
    colour: "#e6ad39",
    summary: "Get a better answer from the same model, while using compute more intelligently.",
    question: "How does each live request become better or cheaper?",
    features: [
      { lead: "Think when needed", parts: ["Spend more ", ["test-time compute", "test-time-compute"], " only on difficult requests."] },
      { lead: "Use infrastructure well", parts: [["Cache", "caching"], " repeated work, use ", ["batching", "batching"], " and compress models through ", ["quantisation", "quantisation"], "."] },
      { lead: "Route by difficulty", parts: [["Dynamically route", "dynamic-routing"], " each job to the right model, tool or reviewer."] },
      { lead: "Ground the answer", parts: ["Use ", ["retrieval during inference", "retrieval"], " to bring in current, permissioned evidence."] },
    ],
    flywheel: ["Better answers", "More usage", "More revenue", "More inference budget"],
    lever: "Efficiency",
  },
  harness: {
    number: "03",
    title: "Harness gains",
    shortTitle: "Harness",
    colour: "#6d70c9",
    summary: "Turn a general model into a dependable application that can complete real work.",
    question: "What surrounds the model so it can act safely and reliably?",
    features: [
      { lead: "Control the job", parts: ["Supply the right ", ["context", "context"], ", plan and ", ["orchestration", "orchestration"], "."] },
      { lead: "Give it capabilities", parts: ["Connect specialised skills and ", ["APIs", "apis"], " with least-privilege access."] },
      { lead: "Keep continuity", parts: ["Use carefully scoped ", ["memory", "memory"], ", explicit ", ["policy", "policy"], " and robust ", ["state management", "state-management"], "."] },
      { lead: "Learn at product level", parts: ["Evaluate completed tasks and improve the whole ", ["application-level RL loop", "app-rl"], "."] },
    ],
    flywheel: ["Better workflows", "More value", "More usage data", "Better workflows"],
    lever: "Utility",
  },
  data: {
    number: "04",
    title: "Data gains",
    shortTitle: "Data",
    colour: "#2c8c78",
    summary: "Convert real use into evidence that improves models, workflows and decisions.",
    question: "How does use create an information advantage?",
    features: [
      { lead: "Use distinctive evidence", parts: ["Ground products in ", ["proprietary data", "proprietary"], " from documents, ", ["CRM", "crm"], " and ", ["ERP", "erp"], " systems."] },
      { lead: "Observe outcomes", parts: ["Capture corrections, successful actions and failure patterns — not merely clicks."] },
      { lead: "Fill rare gaps", parts: ["Generate and verify ", ["synthetic data", "synthetic"], " for unusual or sensitive cases."] },
      { lead: "Close the loop", parts: ["Feed governed examples into evaluation, routing, workflow changes and training."] },
    ],
    flywheel: ["More useful data", "Better training", "Better models", "More valuable interactions"],
    lever: "Learning",
  },
  hardware: {
    number: "05",
    title: "Hardware gains",
    shortTitle: "Hardware",
    colour: "#3977c7",
    summary: "Increase the amount of affordable intelligence the physical stack can deliver.",
    question: "How does the physical cost of intelligence fall?",
    features: [
      { lead: "Better accelerators", parts: ["Improve ", ["GPUs", "gpus"], ", ", ["TPUs", "tpus"], " and purpose-built ", ["ASICs", "asics"], "."] },
      { lead: "Feed the chips", parts: ["Increase ", ["HBM", "hbm"], " capacity and bandwidth so compute does not sit idle."] },
      { lead: "Connect the cluster", parts: ["Move data through ", ["NVLink", "nvlink"], ", ", ["InfiniBand", "infiniband"], " and optical networking."] },
      { lead: "Make more usable systems", parts: ["Advance ", ["process nodes", "process-node"], ", ", ["packaging", "packaging"], ", energy efficiency and manufacturing ", ["yields", "yields"], "."] },
    ],
    flywheel: ["Lower unit cost", "More compute", "Better models", "More usage"],
    lever: "Cost",
  },
};

const SCENARIOS = {
  support: {
    label: "Customer support",
    context: "A global service team handles complex account and policy questions.",
    manifestations: {
      models: [
        ["Policy accuracy", "76 → 88%", "A stronger model handles ambiguous intent and exceptions more reliably."],
        ["Useful adoption", "34 → 51%", "Agents trust more suggestions and use the assistant on harder cases."],
        ["Learning signal", "12k → 31k", "More accepted and corrected answers create better post-training examples."],
      ],
      inference: [
        ["Cost per resolution", "£0.42 → £0.25", "Routine questions route to a smaller model; difficult ones receive more compute."],
        ["Evidence coverage", "61 → 92%", "Retrieval adds the exact current policy passage before an answer is drafted."],
        ["Monthly capacity", "1.0× → 1.7×", "Caching and batching let the same infrastructure serve more conversations."],
      ],
      harness: [
        ["End-to-end resolution", "18 → 43%", "The product can check identity, retrieve policy and draft the authorised action."],
        ["Unsafe actions", "1.8 → 0.3%", "Policy gates and human approval stop high-risk refunds before execution."],
        ["Workflow learning", "Ad hoc → weekly", "Resolved cases show which tools, routes and prompts actually work."],
      ],
      data: [
        ["Grounded cases", "38 → 79%", "CRM history and policy documents explain the customer’s specific situation."],
        ["Rare-case coverage", "120 → 640", "Verified synthetic examples exercise unusual refund and account states."],
        ["Evaluation depth", "1 score → 7 slices", "The team sees failure patterns by policy, region and customer type."],
      ],
      hardware: [
        ["Answer latency", "4.8 → 2.1s", "Faster accelerators and memory deliver tokens without long pauses."],
        ["Peak throughput", "1.0× → 2.4×", "Better networking keeps devices working during demand spikes."],
        ["Cost headroom", "£80k released", "Efficiency funds broader deployment and the next capability upgrade."],
      ],
    },
  },
  software: {
    label: "Software delivery",
    context: "A product engineering organisation uses an AI teammate from issue to production.",
    manifestations: {
      models: [
        ["Task success", "57 → 73%", "A stronger model understands larger code changes and unfamiliar frameworks."],
        ["Developer adoption", "41 → 64%", "More engineers delegate complete, testable tasks rather than snippets."],
        ["Verified examples", "9k → 24k", "Accepted patches and test outcomes become high-quality learning signals."],
      ],
      inference: [
        ["Cost per task", "£0.31 → £0.19", "The router reserves long reasoning for cross-file or failing-test work."],
        ["Repository grounding", "54 → 89%", "Retrieval selects relevant code, instructions and change history."],
        ["Tasks per hour", "1.0× → 1.9×", "Prefix caching avoids repeatedly processing the same repository context."],
      ],
      harness: [
        ["Complete pull requests", "22 → 48%", "Planning, editing, tests and review are orchestrated as one stateful job."],
        ["Escaped regressions", "3.1 → 1.2%", "Test gates and permission rules stop unsafe changes before merge."],
        ["Recovery rate", "44 → 78%", "The workflow reads tool errors, retries safely and asks for help when blocked."],
      ],
      data: [
        ["Grounded tasks", "46 → 83%", "Repository conventions and historical fixes shape each proposed change."],
        ["Failure coverage", "180 → 920", "Generated edge cases broaden test and evaluation suites."],
        ["Learning cadence", "Quarterly → daily", "CI results continuously reveal which workflows need improvement."],
      ],
      hardware: [
        ["First token", "2.7 → 1.1s", "Higher memory bandwidth makes the interactive assistant feel immediate."],
        ["Concurrent agents", "40 → 110", "Better cluster utilisation supports more parallel development work."],
        ["Cost headroom", "43% lower", "Savings fund longer context and stronger verification where it matters."],
      ],
    },
  },
  operations: {
    label: "Industrial operations",
    context: "A maintenance team prevents downtime across a fleet of production equipment.",
    manifestations: {
      models: [
        ["Diagnosis accuracy", "69 → 82%", "A multimodal model links technician notes, sounds and inspection images."],
        ["Technician adoption", "28 → 49%", "Useful fault hypotheses make the tool part of the daily routine."],
        ["Labelled incidents", "4k → 11k", "Confirmed repairs connect symptoms to actual root causes."],
      ],
      inference: [
        ["Cost per inspection", "£0.67 → £0.39", "Routine checks use a smaller path; novel faults receive deeper search."],
        ["Manual coverage", "48 → 91%", "Retrieval brings the correct machine and revision-specific procedure."],
        ["Offline capacity", "1.0× → 1.6×", "Quantised models run closer to equipment with limited connectivity."],
      ],
      harness: [
        ["Actionable diagnoses", "24 → 56%", "Sensor lookup, work-order history and parts checks become one workflow."],
        ["Unsafe suggestions", "1.2 → 0.1%", "Policy gates require lockout checks and expert sign-off."],
        ["Time to dispatch", "42 → 17 min", "State management carries evidence cleanly from diagnosis to work order."],
      ],
      data: [
        ["Fleet history used", "31 → 76%", "Maintenance records reveal recurring sequences before failure."],
        ["Rare fault examples", "70 → 410", "Simulated and verified cases improve coverage of dangerous edge conditions."],
        ["Learning loop", "Annual → monthly", "Repair outcomes update diagnostics and maintenance policy."],
      ],
      hardware: [
        ["Edge latency", "6.2 → 2.4s", "Efficient accelerators process imagery near the machine."],
        ["Sites per cluster", "18 → 41", "Improved throughput expands the same central service across the fleet."],
        ["Energy per task", "100 → 58%", "Lower power use makes always-on monitoring economically viable."],
      ],
    },
  },
};

const MASTER_STEPS = [
  { label: "More compute", sub: "Hardware", layer: "hardware" },
  { label: "Better foundation models", sub: "Capability", layer: "models" },
  { label: "Better inference", sub: "Efficiency", layer: "inference" },
  { label: "More capable applications", sub: "Harness", layer: "harness" },
  { label: "Higher usage", sub: "Adoption", layer: "harness", icon: "usage" },
  { label: "More data + revenue", sub: "Learning and reinvestment", layer: "data" },
];

const NODE_POSITIONS = {
  models: { x: 226, y: 128 },
  inference: { x: 474, y: 128 },
  harness: { x: 558, y: 364 },
  data: { x: 350, y: 532 },
  hardware: { x: 142, y: 364 },
};

function Icon({ type, size = 34 }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "models") {
    return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true"><g {...common}><path d="M16 7.5c-1.8-3.5-7.2-2.8-7.2 1.5-3.4.4-4.2 4.7-1.5 6.3-2 2.5-.3 6.2 2.9 6.1.4 4.1 4.5 4.5 5.8 1.3V7.5Z"/><path d="M16 7.5c1.8-3.5 7.2-2.8 7.2 1.5 3.4.4 4.2 4.7 1.5 6.3 2 2.5.3 6.2-2.9 6.1-.4 4.1-4.5 4.5-5.8 1.3M11 11.2c2 .2 2.8 1.3 2.8 3M10 18c2-.4 3.4.3 4.1 2.1M21 11.2c-2 .2-2.8 1.3-2.8 3M22 18c-2-.4-3.4.3-4.1 2.1"/></g></svg>;
  }
  if (type === "inference") {
    return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true"><path d="M18.2 3 7.6 17.4h7.1l-1.2 11.5 10.9-16h-7L18.2 3Z" {...common}/></svg>;
  }
  if (type === "harness") {
    return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true"><g {...common}><path d="m16 3 11 6.3v13L16 29 5 22.3v-13L16 3Z"/><path d="m5.4 9.5 10.6 6.2 10.6-6.2M16 15.7V29M10.5 6.2 21.4 12.5M21.5 6.2 10.6 12.5"/></g></svg>;
  }
  if (type === "data") {
    return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true"><g {...common}><ellipse cx="16" cy="7" rx="9" ry="4"/><path d="M7 7v8c0 2.2 4 4 9 4s9-1.8 9-4V7M7 15v8c0 2.2 4 4 9 4s9-1.8 9-4v-8"/></g></svg>;
  }
  if (type === "usage") {
    return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true"><g {...common}><circle cx="11" cy="11" r="4"/><circle cx="22.5" cy="12.5" r="3"/><path d="M3.8 26c.6-5.1 3-7.7 7.2-7.7s6.6 2.6 7.2 7.7M18 20.2c1.1-.9 2.6-1.4 4.5-1.4 3.5 0 5.4 2.4 5.8 6.5"/></g></svg>;
  }
  return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true"><g {...common}><rect x="9" y="9" width="14" height="14" rx="1"/><rect x="12.5" y="12.5" width="7" height="7"/><path d="M12 4v5m8-5v5M12 23v5m8-5v5M4 12h5m-5 8h5m14-8h5m-5 8h5"/></g></svg>;
}

function ArrowIcon({ direction = "right" }) {
  const transform = direction === "down" ? "rotate(90 12 12)" : "";
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g transform={transform} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13"/><path d="m14 7 5 5-5 5"/></g></svg>;
}

function renderParts(parts, onOpen) {
  return parts.map((part, index) => {
    if (Array.isArray(part)) {
      const [label, key] = part;
      return <HardTerm key={`${key}-${index}`} termKey={key} label={label} onOpen={onOpen} />;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function HardTerm({ termKey, label, onOpen }) {
  const term = TERM_DETAILS[termKey];
  if (!term) return label;
  return (
    <span className="af-term-wrap">
      <button className="af-term" type="button" onClick={() => onOpen(termKey)} aria-label={`Explain ${term.label}`}>
        {label}
      </button>
      <span className="af-term-tip" role="tooltip">
        <strong>{term.label}</strong>
        <span>{term.short}</span>
        <em>Click for the full explanation</em>
      </span>
    </span>
  );
}

function FlywheelDiagram({ selected, onSelect, running }) {
  const selectedLayer = LAYERS[selected];
  const paths = [
    "M286 92 C338 60 411 66 442 94",
    "M516 178 C552 220 568 274 563 302",
    "M522 420 C488 474 432 507 400 516",
    "M294 516 C234 500 183 462 164 421",
    "M136 301 C136 246 157 192 188 163",
  ];
  return (
    <svg className={`af-flywheel-svg ${running ? "is-running" : ""}`} viewBox="0 0 700 650" role="img" aria-labelledby="flywheel-title flywheel-desc">
      <title id="flywheel-title">Five interactive AI flywheels</title>
      <desc id="flywheel-desc">Model, inference, harness, data and hardware gains compound around a central intelligence value loop. Select any node to explore it.</desc>
      <defs>
        <marker id="af-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <filter id="af-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodOpacity="0.12"/>
        </filter>
      </defs>

      <circle cx="350" cy="325" r="225" className="af-orbit-guide" />
      {paths.map((path, index) => <path key={path} d={path} className={`af-orbit-path af-orbit-${index}`} markerEnd="url(#af-arrow)" />)}

      <g className="af-centre" transform="translate(350 325)">
        <circle r="113" className="af-centre-disc" filter="url(#af-shadow)" />
        <circle r="97" className="af-centre-inner" style={{ stroke: selectedLayer.colour }} />
        <text y="-37" textAnchor="middle" className="af-centre-kicker">COMPOUNDING</text>
        <text y="-9" textAnchor="middle" className="af-centre-title">Intelligence value</text>
        <line x1="-34" x2="34" y1="12" y2="12" style={{ stroke: selectedLayer.colour }} />
        <text y="38" textAnchor="middle" className="af-centre-copy">Lower cost · higher capability</text>
        <text y="60" textAnchor="middle" className="af-centre-copy">more real-world utility</text>
      </g>

      {Object.entries(NODE_POSITIONS).map(([key, position]) => {
        const layer = LAYERS[key];
        const active = selected === key;
        return (
          <g
            key={key}
            className={`af-node ${active ? "is-active" : ""}`}
            transform={`translate(${position.x} ${position.y})`}
            role="button"
            tabIndex="0"
            aria-label={`${layer.title}. ${layer.summary}`}
            onClick={() => onSelect(key)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(key); } }}
            style={{ "--node-colour": layer.colour }}
          >
            <circle r="65" className="af-node-hit" />
            <circle r="55" className="af-node-ring" filter="url(#af-shadow)" />
            <circle r="43" className="af-node-fill" />
            <foreignObject x="-21" y="-21" width="42" height="42" className="af-node-icon">
              <div xmlns="http://www.w3.org/1999/xhtml"><Icon type={key} size={42} /></div>
            </foreignObject>
            <text y="82" textAnchor="middle" className="af-node-number">{layer.number}</text>
            <text y="104" textAnchor="middle" className="af-node-label">{layer.shortTitle}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MasterLoop({ selected, activeStep, onSelect }) {
  return (
    <div className="af-master-loop" aria-label="Master end-to-end value loop">
      {MASTER_STEPS.map((step, index) => {
        const layer = LAYERS[step.layer];
        const active = activeStep === index;
        return (
          <React.Fragment key={`${step.label}-${index}`}>
            <button
              type="button"
              className={`af-master-step ${active ? "is-running" : ""} ${selected === step.layer ? "is-related" : ""}`}
              style={{ "--step-colour": layer.colour }}
              onClick={() => onSelect(step.layer)}
            >
              <span className="af-master-icon"><Icon type={step.icon || step.layer} size={24} /></span>
              <span><strong>{step.label}</strong><small>{step.sub}</small></span>
            </button>
            {index < MASTER_STEPS.length - 1 && <span className={`af-master-arrow ${activeStep === index ? "is-running" : ""}`}><ArrowIcon direction="down" /></span>}
          </React.Fragment>
        );
      })}
      <svg className="af-return-arrow" viewBox="0 0 56 330" aria-hidden="true">
        <path d="M8 305 C48 305 47 282 47 253 L47 72 C47 41 36 22 12 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 6" markerEnd="url(#af-return-tip)"/>
        <defs><marker id="af-return-tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z" fill="currentColor"/></marker></defs>
      </svg>
    </div>
  );
}

function TermDrawer({ termKey, onClose }) {
  const closeButton = useRef(null);
  const term = termKey ? TERM_DETAILS[termKey] : null;
  useEffect(() => {
    if (!term) return undefined;
    closeButton.current?.focus();
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [term, onClose]);
  if (!term) return null;
  return (
    <div className="af-modal-shell" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="af-term-drawer" role="dialog" aria-modal="true" aria-labelledby="af-term-title">
        <button ref={closeButton} type="button" className="af-close" onClick={onClose} aria-label="Close explanation">×</button>
        <p className="af-drawer-label">Hard term, made plain</p>
        <h2 id="af-term-title">{term.label}</h2>
        <p className="af-drawer-short">{term.short}</p>
        <div className="af-explain-block">
          <span>In plain English</span>
          <p>{term.plain}</p>
        </div>
        <div className="af-explain-block af-example-block">
          <span>Concrete example</span>
          <p>{term.example}</p>
        </div>
        <div className="af-explain-block af-watch-block">
          <span>What to watch</span>
          <p>{term.watch}</p>
        </div>
      </section>
    </div>
  );
}

export default function AIFlywheelSystem({ initialSettings = {}, onSettingsChange }) {
  const validLayer = LAYERS[initialSettings.layer] ? initialSettings.layer : DEFAULT_SETTINGS.layer;
  const validScenario = SCENARIOS[initialSettings.scenario] ? initialSettings.scenario : DEFAULT_SETTINGS.scenario;
  const [selected, setSelected] = useState(validLayer);
  const [scenario, setScenario] = useState(validScenario);
  const [openTerm, setOpenTerm] = useState(null);
  const [cycle, setCycle] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const layer = LAYERS[selected];
  const scenarioData = SCENARIOS[scenario];
  const outcomes = scenarioData.manifestations[selected];

  useEffect(() => {
    onSettingsChange?.({ layer: selected, scenario });
  }, [selected, scenario, onSettingsChange]);

  useEffect(() => {
    if (!running) return undefined;
    let next = 0;
    setActiveStep(0);
    const timer = window.setInterval(() => {
      next += 1;
      if (next >= MASTER_STEPS.length) {
        window.clearInterval(timer);
        setCycle((current) => current + 1);
        setRunning(false);
        setActiveStep(-1);
        return;
      }
      setActiveStep(next);
    }, 560);
    return () => window.clearInterval(timer);
  }, [running]);

  const multiplier = useMemo(() => (1 + cycle * 0.14).toFixed(2), [cycle]);

  const chooseLayer = (key) => {
    setSelected(key);
    setCycle(0);
    setRunning(false);
    setActiveStep(-1);
  };

  const runCycle = () => {
    if (!running) setRunning(true);
  };

  return (
    <div className="af-app" style={{ "--accent": layer.colour }}>
      <style>{STYLES}</style>
      <header className="af-header">
        <a className="af-brand" href="#top" aria-label="AI Flywheel home">
          <svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true"><circle cx="17" cy="17" r="14" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M17 7a10 10 0 0 1 8.6 5M27 17a10 10 0 0 1-5 8.7M17 27a10 10 0 0 1-8.7-5M7 17a10 10 0 0 1 5-8.7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
          <span>AI Flywheel</span>
        </a>
        <p>Click a wheel. Hover an underlined term. Run the system.</p>
      </header>

      <main id="top">
        <section className="af-intro">
          <div>
            <h1>How intelligence<br/><em>compounds.</em></h1>
          </div>
          <div className="af-intro-copy">
            <p>Five linked systems make AI more capable, cheaper and more useful. The advantage is not any single breakthrough — it is how each gain funds and informs the next.</p>
            <span><b>Explore the system</b><ArrowIcon direction="down" /></span>
          </div>
        </section>

        <section className="af-workbench" aria-label="Interactive AI flywheel explorer">
          <div className="af-canvas-panel">
            <div className="af-panel-heading">
              <div>
                <span className="af-index">SYSTEM MAP / 05 LOOPS</span>
                <h2>Five interlocking flywheels</h2>
              </div>
              <div className="af-selection-key"><i style={{ background: layer.colour }} />Selected: {layer.shortTitle}</div>
            </div>
            <FlywheelDiagram selected={selected} onSelect={chooseLayer} running={running} />
            <div className="af-layer-switcher" role="group" aria-label="Select a flywheel">
              {Object.entries(LAYERS).map(([key, item]) => (
                <button key={key} type="button" aria-pressed={selected === key} className={selected === key ? "is-active" : ""} style={{ "--item-colour": item.colour }} onClick={() => chooseLayer(key)}>
                  <span>{item.number}</span>{item.shortTitle}
                </button>
              ))}
            </div>
          </div>

          <aside className="af-detail-panel" aria-live="polite">
            <div className="af-detail-topline">
              <span style={{ color: layer.colour }}>{layer.number}</span>
              <span>{layer.lever}</span>
            </div>
            <h2>{layer.title}</h2>
            <p className="af-question">{layer.question}</p>
            <p className="af-summary">{layer.summary}</p>
            <div className="af-feature-list">
              {layer.features.map((feature, index) => (
                <div className="af-feature" key={feature.lead}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p><strong>{feature.lead}.</strong> {renderParts(feature.parts, setOpenTerm)}</p>
                </div>
              ))}
            </div>
            <div className="af-mini-loop">
              <span>Its compounding loop</span>
              <div>{layer.flywheel.map((item, index) => <React.Fragment key={`${item}-${index}`}><b>{item}</b>{index < layer.flywheel.length - 1 && <ArrowIcon />}</React.Fragment>)}</div>
            </div>
          </aside>
        </section>

        <section className="af-manifest-section" aria-labelledby="manifest-title">
          <div className="af-manifest-heading">
            <div>
              <span className="af-index">FROM DIAGRAM TO REALITY</span>
              <h2 id="manifest-title">See how it manifests.</h2>
            </div>
            <p>Choose a setting, then run the master loop. The figures are illustrative directional metrics — the point is the mechanism, not a forecast.</p>
          </div>

          <div className="af-scenario-tabs" role="tablist" aria-label="Choose a use case">
            {Object.entries(SCENARIOS).map(([key, item]) => (
              <button key={key} type="button" role="tab" aria-selected={scenario === key} aria-controls="af-scenario-panel" className={scenario === key ? "is-active" : ""} onClick={() => { setScenario(key); setCycle(0); }}>
                <span>{item.label}</span><ArrowIcon />
              </button>
            ))}
          </div>

          <div className="af-manifest-grid">
            <div className="af-outcome-panel" id="af-scenario-panel" role="tabpanel">
              <div className="af-outcome-context">
                <span>{scenarioData.label} × {layer.title}</span>
                <p>{scenarioData.context}</p>
              </div>
              <div className="af-outcomes">
                {outcomes.map(([label, value, description], index) => (
                  <button type="button" key={label} className="af-outcome" onClick={() => setCycle((current) => current + 1)} style={{ "--delay": `${index * 90}ms` }}>
                    <span className="af-outcome-number">0{index + 1}</span>
                    <span className="af-outcome-copy"><strong>{label}</strong><small>{description}</small></span>
                    <b>{value}</b>
                  </button>
                ))}
              </div>
              <div className="af-cycle-control">
                <button type="button" className="af-run-button" onClick={runCycle} disabled={running}>
                  <span>{running ? "Loop in motion" : "Run one full cycle"}</span>
                  <i><ArrowIcon /></i>
                </button>
                <div className="af-cycle-meter">
                  <span>Compounding index</span>
                  <strong>{multiplier}×</strong>
                  <small>{cycle === 0 ? "Run the loop to see value build" : `${cycle} completed ${cycle === 1 ? "cycle" : "cycles"}`}</small>
                </div>
              </div>
            </div>

            <div className="af-master-panel">
              <div className="af-master-heading">
                <span className="af-index">THE MASTER FLYWHEEL</span>
                <h3>End-to-end value loop</h3>
              </div>
              <MasterLoop selected={selected} activeStep={activeStep} onSelect={chooseLayer} />
              <p className="af-master-note"><strong>Lower layers reduce the cost of intelligence.</strong> Upper layers multiply what that intelligence can accomplish.</p>
            </div>
          </div>
        </section>

        <footer className="af-footer">
          <p>The durable advantage is the loop, not the layer.</p>
          <span>Interactive systems map · All artwork is native SVG</span>
        </footer>
      </main>

      <TermDrawer termKey={openTerm} onClose={() => setOpenTerm(null)} />
    </div>
  );
}

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; }
  button, a { -webkit-tap-highlight-color: transparent; }
  .af-app {
    --paper: #f3efe6;
    --paper-deep: #e8e1d3;
    --ink: #15191b;
    --muted: #676760;
    --line: rgba(21, 25, 27, 0.18);
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    overflow-x: hidden;
  }
  .af-app button { font: inherit; color: inherit; }
  .af-header {
    width: min(1500px, calc(100% - 64px));
    margin: 0 auto;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid var(--line);
  }
  .af-brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; text-decoration: none; font-weight: 760; letter-spacing: -0.02em; }
  .af-brand svg { color: var(--accent); transition: color 240ms ease; }
  .af-header > p { margin: 0; color: var(--muted); font-size: 13px; letter-spacing: 0.01em; }
  .af-intro {
    width: min(1500px, calc(100% - 64px));
    margin: 0 auto;
    padding: clamp(58px, 8vw, 112px) 0 clamp(48px, 7vw, 90px);
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(300px, .7fr);
    gap: 8vw;
    align-items: end;
  }
  .af-intro h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(64px, 8.6vw, 148px); line-height: .82; font-weight: 400; letter-spacing: -0.07em; }
  .af-intro h1 em { color: var(--accent); font-weight: 400; transition: color 240ms ease; }
  .af-intro-copy { max-width: 520px; padding-bottom: 4px; }
  .af-intro-copy > p { margin: 0 0 32px; font-family: Georgia, "Times New Roman", serif; font-size: clamp(20px, 2vw, 29px); line-height: 1.38; letter-spacing: -0.025em; }
  .af-intro-copy > span { display: inline-flex; align-items: center; gap: 10px; text-transform: uppercase; letter-spacing: .11em; font-size: 11px; }
  .af-workbench { display: grid; grid-template-columns: minmax(0, 1.56fr) minmax(370px, .74fr); border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); }
  .af-canvas-panel { padding: 34px clamp(26px, 4vw, 68px) 28px; min-width: 0; border-right: 1px solid var(--ink); }
  .af-panel-heading, .af-manifest-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .af-index { display: block; margin-bottom: 10px; font-size: 10px; font-weight: 800; letter-spacing: .13em; color: var(--muted); }
  .af-panel-heading h2, .af-manifest-heading h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-weight: 400; letter-spacing: -.035em; }
  .af-panel-heading h2 { font-size: clamp(30px, 3vw, 48px); }
  .af-selection-key { display: flex; align-items: center; gap: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .09em; font-weight: 700; white-space: nowrap; }
  .af-selection-key i { width: 8px; height: 8px; border-radius: 50%; }
  .af-flywheel-svg { display: block; width: min(100%, 870px); margin: -6px auto -18px; overflow: visible; color: var(--ink); }
  .af-orbit-guide { fill: none; stroke: rgba(21,25,27,.08); stroke-width: 1; stroke-dasharray: 2 9; }
  .af-orbit-path { fill: none; stroke: currentColor; stroke-width: 2.1; stroke-linecap: round; opacity: .68; }
  .af-flywheel-svg.is-running .af-orbit-path { stroke: var(--accent); stroke-dasharray: 12 8; animation: af-dash .8s linear infinite; opacity: 1; }
  .af-centre-disc { fill: #fbf9f3; stroke: var(--ink); stroke-width: 1.5; }
  .af-centre-inner { fill: none; stroke-width: 2; stroke-dasharray: 2 6; transition: stroke 240ms ease; }
  .af-centre-kicker { font-size: 11px; font-weight: 800; letter-spacing: .16em; }
  .af-centre-title { font: 400 23px Georgia, serif; letter-spacing: -.03em; }
  .af-centre line { stroke-width: 2; }
  .af-centre-copy { fill: var(--muted); font-size: 11.5px; }
  .af-node { cursor: pointer; outline: none; color: var(--ink); }
  .af-node-hit { fill: transparent; }
  .af-node-ring { fill: #fbf9f3; stroke: var(--ink); stroke-width: 1.5; transition: stroke 180ms ease, transform 180ms ease, fill 180ms ease; }
  .af-node-fill { fill: var(--paper); stroke: transparent; transition: fill 180ms ease; }
  .af-node-icon { color: var(--ink); pointer-events: none; }
  .af-node-icon div { width: 100%; height: 100%; display: grid; place-items: center; }
  .af-node-number { font-size: 9px; font-weight: 800; letter-spacing: .12em; fill: var(--muted); }
  .af-node-label { font: 400 16px Georgia, serif; fill: var(--ink); }
  .af-node:hover .af-node-ring, .af-node:focus .af-node-ring { stroke: var(--node-colour); stroke-width: 3; transform: scale(1.04); }
  .af-node.is-active .af-node-ring { stroke: var(--node-colour); stroke-width: 3; }
  .af-node.is-active .af-node-fill { fill: var(--node-colour); }
  .af-node.is-active .af-node-icon { color: #fff; }
  .af-node.is-active .af-node-label { font-weight: 700; }
  .af-layer-switcher { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--line); }
  .af-layer-switcher button { position: relative; border: 0; border-right: 1px solid var(--line); background: transparent; padding: 18px 8px 16px; cursor: pointer; font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; transition: background 180ms ease; }
  .af-layer-switcher button:last-child { border-right: 0; }
  .af-layer-switcher button::before { content: ""; position: absolute; top: -1px; left: 0; right: 0; height: 3px; background: var(--item-colour); transform: scaleX(0); transform-origin: left; transition: transform 180ms ease; }
  .af-layer-switcher button:hover, .af-layer-switcher button:focus-visible { background: rgba(255,255,255,.44); outline: none; }
  .af-layer-switcher button.is-active::before { transform: scaleX(1); }
  .af-layer-switcher button span { display: block; margin-bottom: 6px; font-size: 9px; color: var(--muted); }
  .af-detail-panel { padding: 38px clamp(26px, 3vw, 48px) 36px; background: #faf8f2; min-width: 0; }
  .af-detail-topline { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid var(--line); font-size: 10px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }
  .af-detail-topline span:first-child { font-family: Georgia, serif; font-size: 32px; line-height: 1; font-weight: 400; }
  .af-detail-panel > h2 { margin: 32px 0 7px; font: 400 clamp(40px, 4vw, 68px)/.98 Georgia, serif; letter-spacing: -.055em; }
  .af-question { margin: 0 0 22px; color: var(--accent); font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; transition: color 240ms ease; }
  .af-summary { margin: 0; font: 400 19px/1.45 Georgia, serif; color: #333532; }
  .af-feature-list { margin-top: 30px; border-top: 1px solid var(--ink); }
  .af-feature { display: grid; grid-template-columns: 31px 1fr; gap: 13px; padding: 17px 0; border-bottom: 1px solid var(--line); }
  .af-feature > span { padding-top: 3px; color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: .12em; }
  .af-feature p { margin: 0; font-size: 13.5px; line-height: 1.55; }
  .af-feature p strong { font-weight: 780; }
  .af-term-wrap { position: relative; display: inline; }
  .af-term { border: 0; border-bottom: 1px dashed var(--accent); background: transparent; padding: 0; color: inherit; font-weight: 720; cursor: help; }
  .af-term:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .af-term-tip { position: absolute; left: 50%; bottom: calc(100% + 10px); z-index: 20; width: min(300px, 76vw); padding: 14px 15px; background: var(--ink); color: white; box-shadow: 0 16px 40px rgba(0,0,0,.22); opacity: 0; visibility: hidden; transform: translate(-50%, 6px); transition: opacity 150ms ease, transform 150ms ease, visibility 150ms; pointer-events: none; text-align: left; }
  .af-term-tip::after { content: ""; position: absolute; top: 100%; left: 50%; border: 6px solid transparent; border-top-color: var(--ink); transform: translateX(-50%); }
  .af-term-tip strong, .af-term-tip span, .af-term-tip em { display: block; }
  .af-term-tip strong { margin-bottom: 5px; font-size: 12px; }
  .af-term-tip span { color: #deddd8; font-size: 11px; line-height: 1.45; font-weight: 450; }
  .af-term-tip em { margin-top: 8px; color: #aaa9a3; font-size: 9px; font-style: normal; text-transform: uppercase; letter-spacing: .08em; }
  .af-term:hover + .af-term-tip, .af-term:focus + .af-term-tip { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
  .af-mini-loop { margin-top: 28px; padding: 17px; background: var(--paper); border-left: 3px solid var(--accent); }
  .af-mini-loop > span { display: block; margin-bottom: 12px; font-size: 9px; color: var(--muted); font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
  .af-mini-loop > div { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
  .af-mini-loop b { font: 400 12px Georgia, serif; }
  .af-mini-loop svg { width: 13px; color: var(--accent); }
  .af-manifest-section { padding: clamp(70px, 8vw, 120px) max(32px, calc((100vw - 1500px)/2)); }
  .af-manifest-heading { align-items: end; margin-bottom: 46px; }
  .af-manifest-heading h2 { font-size: clamp(52px, 6.2vw, 100px); line-height: .9; }
  .af-manifest-heading > p { max-width: 470px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
  .af-scenario-tabs { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); margin-bottom: 28px; }
  .af-scenario-tabs button { display: flex; align-items: center; justify-content: space-between; border: 0; border-right: 1px solid var(--line); background: transparent; padding: 19px 21px; cursor: pointer; font-family: Georgia, serif; font-size: 16px; transition: color 180ms ease, background 180ms ease; }
  .af-scenario-tabs button:last-child { border-right: 0; }
  .af-scenario-tabs button:hover, .af-scenario-tabs button:focus-visible { background: rgba(255,255,255,.4); outline: none; }
  .af-scenario-tabs button.is-active { color: white; background: var(--ink); }
  .af-manifest-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(360px, .55fr); border: 1px solid var(--ink); }
  .af-outcome-panel { padding: clamp(26px, 3vw, 48px); border-right: 1px solid var(--ink); background: #faf8f2; }
  .af-outcome-context { display: grid; grid-template-columns: minmax(170px, .45fr) 1fr; gap: 38px; padding-bottom: 26px; border-bottom: 1px solid var(--ink); }
  .af-outcome-context span { color: var(--accent); font-size: 10px; font-weight: 850; text-transform: uppercase; letter-spacing: .11em; }
  .af-outcome-context p { margin: 0; max-width: 560px; font: 400 20px/1.35 Georgia, serif; }
  .af-outcomes { margin-top: 4px; }
  .af-outcome { width: 100%; display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 18px; padding: 25px 0; border: 0; border-bottom: 1px solid var(--line); background: transparent; text-align: left; cursor: pointer; }
  .af-outcome:hover .af-outcome-copy strong { color: var(--accent); }
  .af-outcome-number { font-size: 9px; font-weight: 850; letter-spacing: .12em; color: var(--muted); }
  .af-outcome-copy strong, .af-outcome-copy small { display: block; }
  .af-outcome-copy strong { margin-bottom: 5px; font: 400 20px Georgia, serif; transition: color 180ms ease; }
  .af-outcome-copy small { max-width: 590px; color: var(--muted); font-size: 12px; line-height: 1.45; }
  .af-outcome > b { font: 400 clamp(21px, 2vw, 32px) Georgia, serif; color: var(--accent); white-space: nowrap; }
  .af-cycle-control { display: grid; grid-template-columns: minmax(220px, .75fr) 1fr; gap: 28px; margin-top: 34px; align-items: stretch; }
  .af-run-button { display: flex; align-items: center; justify-content: space-between; min-height: 74px; padding: 0 12px 0 22px; border: 0; background: var(--ink); color: white !important; cursor: pointer; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .af-run-button:disabled { cursor: wait; }
  .af-run-button i { width: 48px; height: 48px; display: grid; place-items: center; background: var(--accent); border-radius: 50%; color: white; transition: transform 180ms ease; }
  .af-run-button:hover:not(:disabled) i { transform: rotate(-25deg) scale(1.05); }
  .af-cycle-meter { display: grid; grid-template-columns: 1fr auto; align-content: center; gap: 2px 18px; padding: 14px 0 14px 24px; border-left: 1px solid var(--line); }
  .af-cycle-meter span { color: var(--muted); font-size: 9px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
  .af-cycle-meter strong { grid-row: 1 / span 2; grid-column: 2; font: 400 45px Georgia, serif; color: var(--accent); }
  .af-cycle-meter small { font-size: 11px; color: var(--muted); }
  .af-master-panel { padding: 38px clamp(25px, 3vw, 42px); background: var(--paper-deep); }
  .af-master-heading { padding-bottom: 23px; border-bottom: 1px solid var(--line); }
  .af-master-heading h3 { margin: 0; font: 400 27px Georgia, serif; letter-spacing: -.03em; }
  .af-master-loop { position: relative; display: flex; flex-direction: column; align-items: stretch; padding: 23px 50px 20px 0; }
  .af-master-step { position: relative; z-index: 2; width: 100%; display: grid; grid-template-columns: 42px 1fr; gap: 11px; align-items: center; padding: 8px 10px; border: 0; background: transparent; text-align: left; cursor: pointer; transition: background 180ms ease, transform 180ms ease; }
  .af-master-step:hover, .af-master-step:focus-visible { background: rgba(255,255,255,.55); outline: none; transform: translateX(3px); }
  .af-master-step.is-related { background: rgba(255,255,255,.5); }
  .af-master-step.is-running { background: var(--step-colour); color: white; transform: translateX(5px); }
  .af-master-icon { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid currentColor; border-radius: 50%; color: var(--step-colour); }
  .af-master-step.is-running .af-master-icon { color: white; }
  .af-master-step strong, .af-master-step small { display: block; }
  .af-master-step strong { font: 400 14px Georgia, serif; }
  .af-master-step small { margin-top: 2px; color: var(--muted); font-size: 9px; }
  .af-master-step.is-running small { color: rgba(255,255,255,.78); }
  .af-master-arrow { height: 14px; margin-left: 18px; display: grid; place-items: center; align-self: flex-start; color: var(--muted); }
  .af-master-arrow svg { width: 13px; height: 13px; }
  .af-master-arrow.is-running { color: var(--accent); animation: af-pulse .7s ease-in-out infinite; }
  .af-return-arrow { position: absolute; right: 0; top: 23px; width: 47px; height: calc(100% - 45px); color: var(--muted); overflow: visible; }
  .af-master-note { margin: 0; padding-top: 22px; border-top: 1px solid var(--line); color: var(--muted); font: 400 13px/1.5 Georgia, serif; }
  .af-master-note strong { color: var(--ink); }
  .af-footer { min-height: 220px; display: flex; align-items: end; justify-content: space-between; gap: 30px; width: min(1500px, calc(100% - 64px)); margin: 0 auto; padding: 50px 0 38px; border-top: 1px solid var(--line); }
  .af-footer p { margin: 0; max-width: 760px; font: 400 clamp(35px, 5vw, 76px)/.96 Georgia, serif; letter-spacing: -.045em; }
  .af-footer span { max-width: 260px; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; text-align: right; }
  .af-modal-shell { position: fixed; inset: 0; z-index: 1000; display: flex; justify-content: flex-end; background: rgba(21,25,27,.42); backdrop-filter: blur(6px); animation: af-fade 180ms ease both; }
  .af-term-drawer { position: relative; width: min(540px, 100%); height: 100%; overflow-y: auto; padding: clamp(38px, 6vw, 72px); background: #fbf9f3; box-shadow: -20px 0 70px rgba(0,0,0,.16); animation: af-slide 260ms cubic-bezier(.2,.8,.2,1) both; }
  .af-close { position: absolute; top: 22px; right: 24px; width: 42px; height: 42px; border: 1px solid var(--ink); border-radius: 50%; background: transparent; cursor: pointer; font-size: 28px; line-height: 1; }
  .af-close:hover, .af-close:focus-visible { background: var(--ink); color: white; outline: none; }
  .af-drawer-label { margin: 0 0 48px; color: var(--accent); font-size: 10px; font-weight: 850; text-transform: uppercase; letter-spacing: .13em; }
  .af-term-drawer h2 { margin: 0 0 18px; font: 400 clamp(48px, 7vw, 78px)/.95 Georgia, serif; letter-spacing: -.055em; }
  .af-drawer-short { margin: 0 0 42px; color: #484a47; font: 400 21px/1.45 Georgia, serif; }
  .af-explain-block { padding: 24px 0; border-top: 1px solid var(--line); }
  .af-explain-block > span { display: block; margin-bottom: 10px; color: var(--muted); font-size: 9px; font-weight: 850; text-transform: uppercase; letter-spacing: .12em; }
  .af-explain-block p { margin: 0; font-size: 14px; line-height: 1.65; }
  .af-example-block { border-left: 3px solid var(--accent); margin-top: 8px; padding-left: 20px; }
  .af-watch-block { margin-top: 8px; padding: 20px; border: 0; background: var(--paper-deep); }
  @keyframes af-dash { to { stroke-dashoffset: -20; } }
  @keyframes af-pulse { 50% { transform: translateY(3px); } }
  @keyframes af-fade { from { opacity: 0; } }
  @keyframes af-slide { from { transform: translateX(40px); opacity: .4; } }
  @media (max-width: 1100px) {
    .af-workbench { grid-template-columns: 1fr; }
    .af-canvas-panel { border-right: 0; border-bottom: 1px solid var(--ink); }
    .af-detail-panel { padding: 48px max(32px, 8vw); }
    .af-feature-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0 30px; }
    .af-manifest-grid { grid-template-columns: 1fr; }
    .af-outcome-panel { border-right: 0; border-bottom: 1px solid var(--ink); }
    .af-master-loop { max-width: 520px; }
  }
  @media (max-width: 760px) {
    .af-header, .af-intro, .af-footer { width: calc(100% - 34px); }
    .af-header { min-height: 68px; }
    .af-header > p { display: none; }
    .af-intro { grid-template-columns: 1fr; gap: 42px; padding: 58px 0 52px; }
    .af-intro h1 { font-size: clamp(56px, 20vw, 88px); }
    .af-intro-copy > p { font-size: 20px; }
    .af-canvas-panel { padding: 25px 12px 16px; }
    .af-panel-heading { padding: 0 5px; }
    .af-selection-key { display: none; }
    .af-flywheel-svg { margin: 7px auto -3px; }
    .af-node-number, .af-node-label { display: none; }
    .af-layer-switcher { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .af-layer-switcher button { padding: 14px 2px 12px; font-size: 8px; letter-spacing: 0; }
    .af-detail-panel { padding: 36px 21px; }
    .af-detail-panel > h2 { font-size: 48px; }
    .af-feature-list { grid-template-columns: 1fr; }
    .af-term-tip { display: none; }
    .af-manifest-section { padding: 68px 17px; }
    .af-manifest-heading { display: block; }
    .af-manifest-heading h2 { font-size: 56px; margin-bottom: 25px; }
    .af-scenario-tabs { grid-template-columns: 1fr; }
    .af-scenario-tabs button { border-right: 0; border-bottom: 1px solid var(--line); }
    .af-scenario-tabs button:last-child { border-bottom: 0; }
    .af-manifest-grid { border-left: 0; border-right: 0; }
    .af-outcome-panel, .af-master-panel { padding: 27px 18px; }
    .af-outcome-context { grid-template-columns: 1fr; gap: 10px; }
    .af-outcome { grid-template-columns: 24px 1fr; gap: 12px; }
    .af-outcome > b { grid-column: 2; margin-top: 2px; }
    .af-cycle-control { grid-template-columns: 1fr; }
    .af-cycle-meter { min-height: 78px; }
    .af-footer { min-height: 190px; display: block; }
    .af-footer p { margin-bottom: 35px; }
    .af-footer span { display: block; text-align: left; }
    .af-term-drawer { padding: 70px 24px 32px; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  }
`;
