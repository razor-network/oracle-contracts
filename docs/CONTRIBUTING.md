# Contributing to Oracle Contracts

This guide explains how to contribute to the Oracle Contracts project, covering everything from setting up your development environment to submitting pull requests.

## Development Setup

### Prerequisites
- Node.js >= 16
- Git
- npm or yarn
- Hardhat development environment

### Initial Setup

1. Fork the repository on GitHub:
   - Visit [razor-network/contracts](https://github.com/razor-network/contracts)
   - Click the 'Fork' button
   - Clone your fork locally:
   ```bash
   git clone git@github.com:YourLogin/contracts.git
   cd contracts
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream git@github.com:razor-network/contracts.git
   ```

## Development Workflow

### 1. Branch Management

Always create a feature branch for your work:
```bash
# Sync with upstream
git checkout master
git pull upstream master

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Development Process

1. Make your changes in the feature branch
2. Follow the code style guidelines
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation as needed

### 3. Testing Requirements

Run the full test suite before submitting:
```bash
# Run all tests
npm test

# Run specific test scenarios
npm run scenarios

# Check test coverage
npm run coverage
```

Coverage requirements:
- Statements: 90%
- Branches: 60%
- Functions: 85%
- Lines: 86%

### 4. Code Quality

Maintain code quality by running:
```bash
# Run all linters
npm run lint

# Fix linting issues
npm run lint:fix

# Run specific linters
npm run lint:sol  # Solidity files
npm run lint:js   # JavaScript files
```

## Code Style Guidelines

### Solidity Style Guide

1. **Contract Structure**
   ```solidity
   // SPDX-License-Identifier: UNLICENSED
   pragma solidity ^0.8.0;

   contract MyContract {
       // State variables
       // Events
       // Modifiers
       // Constructor
       // External functions
       // Public functions
       // Internal functions
       // Private functions
   }
   ```

2. **Naming Conventions**
   - Contracts: PascalCase
   - Functions: camelCase
   - Variables: camelCase
   - Events: PascalCase
   - Modifiers: camelCase

3. **Documentation**
   - Use NatSpec format for all public interfaces
   - Document parameters and return values
   - Explain complex logic
   ```solidity
   /// @notice Brief description
   /// @dev Detailed description
   /// @param name Description of parameter
   /// @return Description of return value
   ```

### JavaScript Style Guide

1. **File Structure**
   - Use ES modules (import/export)
   - One class/component per file
   - Clear file naming

2. **Code Formatting**
   - Use prettier for consistent formatting
   - 2 space indentation
   - Semicolons required
   - Single quotes for strings

## Pull Request Process

1. **Before Submitting**
   - Sync with upstream master
   - Run all tests
   - Check code coverage
   - Run linters
   - Update documentation

2. **Creating the PR**
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   git push origin feature/your-feature-name
   ```

3. **PR Guidelines**
   - Use conventional commit messages
   - Include tests for new features
   - Update relevant documentation
   - Link related issues
   - Provide clear description of changes

4. **PR Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Checklist
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Code follows style guidelines
   - [ ] All tests passing
   ```

## Smart Contract Development

### 1. Contract Modifications

When modifying contracts:
1. Update interfaces if needed
2. Add new tests
3. Update deployment scripts
4. Document changes in NatSpec

### 2. Testing Guidelines

1. **Test Structure**
   ```javascript
   describe("Contract", () => {
     before(() => {
       // Setup
     });

     it("should do something", async () => {
       // Test
     });
   });
   ```

2. **Test Coverage**
   - Happy path scenarios
   - Edge cases
   - Error conditions
   - Access control
   - State transitions

### 3. Gas Optimization

1. Run gas analysis:
   ```bash
   npm run gas
   ```

2. Compare gas usage:
   ```bash
   npm run gasCompare
   ```

## Documentation

### 1. Code Documentation
- Use NatSpec comments for all public interfaces
- Document complex algorithms
- Explain security considerations
- Update API documentation

### 2. Technical Documentation
- Update relevant .md files
- Keep diagrams current
- Document breaking changes
- Update examples

## Getting Help

1. **Resources**
   - [Project Documentation](docs/README.md)
   - [Core Concepts](docs/core-concepts.md)
   - [API Reference](docs/api-reference.md)

2. **Community**
   - GitHub Issues
   - Development chat
   - Technical discussions

## Related Documentation
- [Architecture Overview](architecture.md)
- [Setup Guide](setup-and-installation.md)
- [API Reference](api-reference.md)
- [Core Concepts](core-concepts.md)
