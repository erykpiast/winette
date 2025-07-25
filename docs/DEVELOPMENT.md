# Development Guide

## Tool Version Management with asdf

This project uses [asdf](https://asdf-vm.com/) to manage Node.js and pnpm versions consistently across development
environments and CI.

### Setting up asdf

1. **Install and set up asdf** (if not already installed):

   ```bash
   # On macOS with Homebrew
   brew install asdf
   ```

2. **Install required plugins**:

   ```bash
   asdf plugin add nodejs
   asdf plugin add pnpm
   ```

3. **Install the versions specified in `.tool-versions`**:

   ```bash
   asdf install
   ```

## Local Development Workflow

1. **Start the development server**:

   ```bash
   pnpm dev
   ```

2. **Run tests**:

   ```bash
   pnpm test
   ```

3. **Check code quality**:

   ```bash
   pnpm lint
   pnpm type-check
   ```

4. **Start Storybook**:

   ```bash
   pnpm storybook
   ```

## CI/CD

The GitHub Actions workflow uses asdf to ensure the same Node.js and pnpm versions are used in CI as in local development.

## Troubleshooting

### asdf not working

```bash
# Refresh asdf plugins
asdf plugin update --all

# Reshim after installing packages
asdf reshim nodejs
asdf reshim pnpm
```

### Version conflicts

```bash
# Check current versions
asdf current

# Reset to project versions
asdf install
```

### pnpm cache issues

```bash
# Clear pnpm cache if needed
pnpm store prune
```
