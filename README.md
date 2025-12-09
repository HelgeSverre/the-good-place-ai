# 🌈 The Good Place AI Simulator

> *"Welcome! Everything is fine."*

Holy motherforking shirtballs! You've stumbled into The Good Place — well, an AI simulation of it anyway. This is definitely not The Bad Place. *Definitely* not.

This delightful experiment uses the [Anthropic Claude SDK](https://docs.anthropic.com/en/docs/claude-sdk) to simulate conversations between your favorite characters from The Good Place. Watch Eleanor be a lovable dirtbag, witness Chidi have an existential crisis over font choices, and listen to Tahani casually mention her close personal friendship with Beyoncé.

## 🎭 Featured Characters

| Character | Vibe |
|-----------|------|
| **Eleanor Shellstrop** | Arizona trash bag turned ethics student. Will call you "ya basic." |
| **Chidi Anagonye** | Philosophy professor. Will need 45 minutes to decide if he wants water. |
| **Tahani Al-Jamil** | British socialite. Best friends with literally everyone famous. |
| **Jason Mendoza** | Jacksonville's finest. Will solve your problems with Molotov cocktails. |
| **Michael** | Reformed demon architect. Still figuring out this "being good" thing. |
| **Janet** | Not a robot. Not a girl. Just Janet. Knows everything. |
| **Shawn** | Actual demon. Wants everyone to suffer. No character development. |
| **Bad Janet** | *farts* Whatever. |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended — we're not savages)
- An Anthropic API key (obtainable at [console.anthropic.com](https://console.anthropic.com))
- A genuine desire to watch AI characters debate ethics while making Jacksonville Jaguars references

### Installation

```bash
# Clone this bench (it's like a bad word but censored)
git clone https://github.com/HelgeSverre/the-good-place-ai.git
cd the-good-place-ai

# Install dependencies
npm install

# Set up your environment (very important, not optional)
cp .env.example .env
```

Now edit `.env` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Running the Simulation

```bash
# Run with a random scenario (live dangerously)
npm start

# Run with a specific scenario
npm start -- --scenario trolley-problem-redux

# Generate a completely new scenario from the void
npm start -- --generate

# Pick your own characters (chaos mode)
npm start -- --characters "Eleanor,Jason,Bad Janet"

# List all available characters
npm start -- --list characters

# List all available scenarios
npm start -- --list scenarios
```

## 📖 CLI Options

| Option | Description |
|--------|-------------|
| `-s, --scenario <name>` | Use a specific scenario by ID |
| `-c, --characters <names>` | Comma-separated character names |
| `-g, --generate` | Generate a random new scenario |
| `-t, --type <type>` | Scenario type: `ethical_dilemma`, `neighborhood_chaos`, `demon_scheme`, `social_gathering`, `character_study` |
| `-m, --max-turns <number>` | Max conversation turns (default: 30) |
| `-v, --verbose` | Show debug output for nerds |
| `-l, --list <type>` | List `characters` or `scenarios` |

## 🎬 Available Scenarios

- **trolley-problem-redux** — Chidi faces a REAL trolley problem. Stomach aches ensue.
- **janets-dinner-party** — Janet hosts a party. What could go wrong?
- **shawns-audit** — The demons are checking in. Everyone act natural.

## 🛠 Project Structure

```
the-good-place-ai/
├── characters/          # Character sheets (markdown with frontmatter)
│   ├── eleanor-shellstrop.md
│   ├── chidi-anagonye.md
│   └── ... more dirtbags
├── scenarios/           # Pre-written scenario files
├── src/
│   ├── agents/          # AI orchestration logic
│   ├── characters/      # Character loading utilities
│   ├── scenarios/       # Scenario handling & generation
│   ├── simulation/      # The actual scene execution
│   ├── cli/             # Command-line interface
│   └── utils/           # Helpers and such
└── package.json
```

## ✨ Creating Custom Characters

Add a new markdown file in `characters/`:

```markdown
---
name: "Your Character Name"
color: "#HEX_COLOR"
shortName: "Nickname"
model: "sonnet"
---

# Your Character Name

## Personality Traits
- Trait 1
- Trait 2

## Speech Patterns
- How they talk

## Catchphrases
- "Something memorable"

## Backstory
The tragic or hilarious backstory...
```

## 🎲 Creating Custom Scenarios

Add a markdown file in `scenarios/`:

```markdown
---
id: my-scenario
name: My Amazing Scenario
type: ethical_dilemma
requiredCharacters:
  - Eleanor
  - Chidi
optionalCharacters:
  - Janet
setting: Somewhere in the neighborhood
mood: comedic
estimatedTurns: 15
---

# My Amazing Scenario

## Description
What happens in this scenario...

## Objectives
1. Goal one
2. Goal two

## Key Beats
1. Thing that should happen
2. Another thing
```

## 🤔 Why Does This Exist?

Look, sometimes you just want to watch AI characters debate whether it's ethical to steal a shopping cart while a demon takes notes. Is that so wrong?

This is a fun experiment in:
- Multi-agent AI conversation systems
- Character voice consistency
- Scenario-driven narrative generation
- Making yourself laugh at 2 AM

## 📜 License

MIT — Do whatever you want. As Eleanor would say: *"Take it sleazy."*

---

> *"What matters isn't if people are good or bad. What matters is if they're trying to be better today than they were yesterday."*
> 
> — Michael (reformed demon, architect, friend)

---

**Not affiliated with NBC, The Good Place, or any actual afterlife bureaucracy. Pobody's nerfect.**
