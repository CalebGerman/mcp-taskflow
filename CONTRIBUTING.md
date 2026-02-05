# Contributing to TaskFlow MCP 🤝

We welcome contributions to TaskFlow MCP. This guide covers how to report issues, propose changes, and submit PRs.

## Table of Contents 📌

- [Reporting Issues](#reporting-issues-)
- [Feature Requests](#feature-requests-)
- [Pull Request Process](#pull-request-process-)
- [Changesets & Versioning](#changesets--versioning-)
- [Code Standards](#code-standards-)

## Reporting Issues 🐞

Before creating a new issue, please search existing issues to avoid duplicates.

### What to Include

Please provide the following information:

- **Version**: Which version of TaskFlow MCP you are using
- **Environment**: Node.js version, operating system, client (VS Code, Claude Desktop, etc.)
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Logs**: Relevant logs or error messages

### Issue Template

```markdown
## Description
Brief description of the issue

## Version Information
- TaskFlow MCP version: x.x.x
- Node.js version: x.x.x
- Operating System: Windows/macOS/Linux

## Steps to Reproduce
1. ...
2. ...
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Logs
```text
Paste any logs or error messages here
```

## Feature Requests 💡

We welcome feature requests. Please:

1. **Check existing issues** for similar requests
2. **Describe the use case** and what problem it solves
3. **Provide examples** of how the feature should work
4. **Consider backwards compatibility** and breaking changes

## Pull Request Process 🔁

1. **Create a branch** from `main`
2. **Install dependencies** and run tests
3. **Make changes** with clear commit messages
4. **Add tests** for behavior changes
5. **Add a changeset** if required
6. **Open a PR** with a clear summary and logs if relevant

## Changesets & Versioning 🦋

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelog generation. **Every PR that affects the public API or user experience must include a changeset.**

Add a changeset for:

- ✅ **New features**
- ✅ **Bug fixes**
- ✅ **Breaking changes**
- ✅ **Performance improvements**

### When to Use `--empty`

Use `pnpm changeset --empty` for:

- 🚫 **Documentation only**
- 🚫 **Internal refactoring**
- 🚫 **Build/tooling changes**
- 🚫 **Tests only**

### Creating a Changeset

```bash
# Add a changeset for your changes
pnpm changeset

# For documentation-only changes
pnpm changeset --empty
```

Follow the prompts to:

1. **Select affected packages** (usually `mcp-taskflow`)
2. **Choose version bump type**: patch, minor, or major
3. **Write a clear summary** of the change

### Changeset Examples

#### New Feature (Minor)

```bash
$ pnpm changeset
🦋  What kind of change is this for mcp-taskflow? › minor
🦋  Summary › Add dependency-aware task sorting
```

#### Bug Fix (Patch)

```bash
$ pnpm changeset
🦋  What kind of change is this for mcp-taskflow? › patch
🦋  Summary › Fix schema validation for tool input
```

#### Breaking Change (Major)

```bash
$ pnpm changeset
🦋  What kind of change is this for mcp-taskflow? › major
🦋  Summary › Remove deprecated tool aliases
```

#### Documentation Only (Empty)

```bash
$ pnpm changeset --empty
🦋  Summary › Update README examples
```

### Release Process

1. **Changesets accumulate** in `.changeset/` directory
2. **Release PR created automatically** by Changesets GitHub Action
3. **Review release PR** for version bumps and changelog accuracy
4. **Merge release PR** to trigger automated publishing
5. **New version published** to npm automatically

## Code Standards 📐


- **TypeScript**: strict typing and explicit nullability
- **Immutability**: prefer `const`, spreads, and readonly fields
- **Async naming**: async methods use the `Async` suffix
- **Validation**: Zod schemas validate all external inputs
- **Comments**: explain intent, avoid control references in inline comments
- **Style**: Prettier enforces 2 spaces, single quotes, trailing commas, 120 char width

### Testing Standards 🧪

- Write unit tests for new functionality
- Maintain or improve coverage
- Use descriptive test names
- Group related tests with `describe`
