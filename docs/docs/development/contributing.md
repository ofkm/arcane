---
sidebar_position: 2
title: Contributing
---

# Contributing to Arcane

Thank you for your interest in contributing to Arcane! We welcome contributions from the community to help make Arcane better. Whether it's reporting a bug, suggesting a feature, or writing code, your help is appreciated.

## Ways to Contribute

- **Reporting Bugs:** If you encounter a bug, please help us by submitting a detailed bug report. Use the [**Bug Report**](https://github.com/ofkm/arcane/issues/new?template=bug.yml) template on GitHub.
- **Suggesting Features:** Have an idea for a new feature or an enhancement? We'd love to hear it! Use the [**Feature Request**](https://github.com/ofkm/arcane/issues/new?template=feature.yml) template on GitHub.
- **Code Contributions:** If you'd like to contribute code, please follow the process outlined below.
- **Documentation:** Improvements to the documentation are always welcome.

## Code Contribution Process

1.  **Fork the Repository:** Start by forking the main Arcane repository on GitHub.
2.  **Clone Your Fork:** Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/<your-username>/arcane.git
    cd arcane
    ```
3.  **Set Upstream Remote:** Add the original repository as the upstream remote:
    ```bash
    git remote add upstream https://github.com/ofkm/arcane.git
    ```
4.  **Create a Branch:** Create a new branch for your feature or bug fix. Use a descriptive name:
    ```bash
    git checkout -b feature/my-new-feature
    # or
    git checkout -b fix/issue-123
    ```
5.  **Set Up Development Environment:** Follow the instructions in the [**Building from Source**](./building.md) guide to install dependencies and ensure you can run the development server.
    ```bash
    npm install
    npm run dev
    ```
6.  **Make Changes:** Implement your feature or bug fix. Write clear, concise code.
7.  **Lint and Format:** Ensure your code adheres to the project's style guidelines by running the linters and formatters:
    ```bash
    npm run lint
    npm run format
    ```
    Fix any issues reported.
8.  **Commit Changes:** Commit your changes with a clear and descriptive commit message. Consider using [Conventional Commits](https://www.conventionalcommits.org/) if applicable.
    ```bash
    git add .
    git commit -m "feat: Add feature X"
    # or
    git commit -m "fix: Resolve issue Y"
    ```
9.  **Keep Your Branch Updated:** Periodically update your branch with the latest changes from the upstream repository:
    ```bash
    git fetch upstream
    git rebase upstream/main
    ```
10. **Push Your Branch:** Push your changes to your forked repository:
    ```bash
    git push origin feature/my-new-feature
    ```
11. **Open a Pull Request:** Go to the original Arcane repository on GitHub and open a Pull Request (PR) from your branch to the main branch of the upstream repository.
    - Provide a clear title and description for your PR.
    - Reference any related issues (e.g., "Closes #123").
    - Be prepared to discuss your changes and make adjustments based on feedback.

## Code Style

Arcane uses [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) to enforce code style and consistency. Please run `npm run lint` and `npm run format` before committing your changes. Configuration files (`.eslint.config.js`, `.prettierrc`) are included in the repository.

Thank you again for contributing to Arcane!
