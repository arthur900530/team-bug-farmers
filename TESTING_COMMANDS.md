# Testing Commands

This document contains all the commands you need to run tests and generate coverage reports for the project.

---

## 📁 Project Structure

```
team-bug-farmers/
├── tests/
│   └── frontend/
│       └── AudioSettings.test.tsx           (34 tests)
├── src/
│   └── components/
│       ├── AudioSettings.tsx                (tested)
│       └── common/
│           └── DraggableModal.tsx          (spec ready)
└── package.json
```

---

## 🧪 Basic Test Commands

### Run All Tests
```bash
npm test
```
**What it does**: Runs all test suites in the `tests/` directory

**Output**:
```
Test Suites: 1 passed, 1 total
Tests:       34 passed, 34 total
Time:        ~1s
```

---

### Run Tests in Watch Mode
```bash
npm run test:watch
```
**What it does**: Runs tests and automatically re-runs them when files change

**Use case**: Development mode - tests re-run as you edit code

**To exit**: Press `q` or `Ctrl+C`

---

### Run Tests with Verbose Output
```bash
npm test -- --verbose
```
**What it does**: Shows detailed test results including all test names

**Output**: Displays each test case with pass/fail status

---

## 📊 Coverage Commands

### Run Tests with Coverage Report
```bash
npm run test:coverage
```
**What it does**: Runs all tests and generates a comprehensive coverage report

**Output**:
```
---------------------------------|---------|----------|---------|---------|
File                             | % Stmts | % Branch | % Funcs | % Lines |
---------------------------------|---------|----------|---------|---------|
AudioSettings.tsx                |   79.66 |    94.44 |   66.66 |   81.03 |
---------------------------------|---------|----------|---------|---------|
```

---

### Coverage for Specific File
```bash
npm test -- --coverage --collectCoverageFrom='src/components/AudioSettings.tsx'
```
**What it does**: Generates coverage report only for AudioSettings.tsx

**Use case**: Focus on specific component coverage

---

### Coverage with HTML Report
```bash
npm test -- --coverage --coverageReporters=html
```
**What it does**: Generates an interactive HTML coverage report

**Output**: Creates `coverage/` directory with HTML files

**View report**: Open `coverage/lcov-report/index.html` in browser

---

## 🎯 Specific Test Commands

### Run Only Frontend Tests
```bash
npm test -- tests/frontend
```
**What it does**: Runs only tests in the `tests/frontend/` directory

---

### Run Specific Test File
```bash
npm test -- tests/frontend/AudioSettings.test.tsx
```
**What it does**: Runs only the AudioSettings test file

---

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="handleMouseMove"
```
**What it does**: Runs only tests whose names match "handleMouseMove"

**Use case**: Test specific functionality without running entire suite

---

### Run Tests with Coverage for Specific Directory
```bash
npm test -- --coverage --collectCoverageFrom='src/components/**/*.{ts,tsx}'
```
**What it does**: Coverage report for all components in src/components/

---

## 🔧 Debug Commands

### Run Tests with Debug Output
```bash
npm test -- --detectOpenHandles
```
**What it does**: Helps identify async operations that prevent Jest from exiting

**Use case**: Debugging hanging tests

---

### Run Tests with No Cache
```bash
npm test -- --no-cache
```
**What it does**: Clears Jest cache before running tests

**Use case**: Fix issues with outdated cached test results

---

### Update Snapshots
```bash
npm test -- -u
```
**What it does**: Updates test snapshots (if using snapshot testing)

**Use case**: When intentional UI changes break snapshot tests

---

## 📈 Coverage Thresholds

### Check if Coverage Meets Thresholds
```bash
npm test -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":70,"lines":80,"statements":80}}'
```
**What it does**: Fails if coverage falls below specified thresholds

**Use case**: CI/CD pipeline quality gates

---

## 🚀 Quick Reference

| Command | Purpose | Output |
|---------|---------|--------|
| `npm test` | Run all tests | Pass/Fail summary |
| `npm run test:watch` | Watch mode | Auto re-run on changes |
| `npm run test:coverage` | Full coverage report | Coverage table |
| `npm test -- --verbose` | Detailed output | All test names |
| `npm test -- tests/frontend` | Run frontend tests only | Frontend test results |
| `npm test -- --coverage --coverageReporters=html` | HTML coverage | Interactive HTML report |

---

## 📊 Understanding Coverage Metrics

### Coverage Metrics Explained

**Statement Coverage**
- Percentage of code statements executed during tests
- **AudioSettings.tsx**: 79.66%

**Branch Coverage** ⭐
- Percentage of decision branches (if/else) tested
- **AudioSettings.tsx**: 94.44% (Excellent!)

**Function Coverage**
- Percentage of functions called during tests
- **AudioSettings.tsx**: 66.66%

**Line Coverage**
- Percentage of code lines executed
- **AudioSettings.tsx**: 81.03%

### What's Good Coverage?

| Coverage Level | Rating | Description |
|---------------|--------|-------------|
| 90-100% | 🌟 Excellent | Comprehensive testing |
| 80-90% | ✅ Very Good | Strong test coverage |
| 70-80% | ✓ Good | Acceptable coverage |
| 60-70% | ⚠️ Fair | Could be improved |
| <60% | ❌ Poor | Needs more tests |

**AudioSettings.tsx Ratings:**
- Branch Coverage: 94.44% 🌟 **Excellent**
- Line Coverage: 81.03% ✅ **Very Good**
- Statement Coverage: 79.66% ✓ **Good**

---

## 🎨 Viewing Coverage Reports

### Terminal Output
```bash
npm run test:coverage
```
Shows ASCII table in terminal

### HTML Interactive Report
```bash
npm test -- --coverage --coverageReporters=html
open coverage/lcov-report/index.html  # macOS
```
- Browse by file
- See exact lines covered/uncovered
- Click through to view source with highlights

### JSON Report (for CI/CD)
```bash
npm test -- --coverage --coverageReporters=json
cat coverage/coverage-final.json
```
Machine-readable format for automation

---

## 🔍 Advanced Filtering

### Run Tests by Suite Name
```bash
npm test -- --testNamePattern="useEffect"
```
Runs all tests in suites containing "useEffect"

### Run Failed Tests Only
```bash
npm test -- --onlyFailures
```
Re-runs only tests that failed in previous run

### Run Tests Changed Since Last Commit
```bash
npm test -- --onlyChanged
```
Runs tests related to uncommitted changes

---

## 💡 Tips & Best Practices

### During Development
```bash
# Use watch mode for instant feedback
npm run test:watch

# Press 'p' to filter by filename
# Press 't' to filter by test name
# Press 'a' to run all tests
# Press 'q' to quit
```

### Before Committing
```bash
# Run full test suite with coverage
npm run test:coverage

# Verify 100% pass rate
# Check coverage hasn't decreased
```

### In CI/CD Pipeline
```bash
# Run with coverage and fail on threshold
npm test -- --coverage --ci --maxWorkers=2
```

---

## 📝 Example Workflow

### 1. Development Workflow
```bash
# Start watch mode
npm run test:watch

# Edit src/components/AudioSettings.tsx
# Tests automatically re-run
# See instant feedback

# Press 'q' when done
```

### 2. Pre-Commit Workflow
```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Verify > 80% coverage on tested files
# Commit if all tests pass
```

### 3. Coverage Review Workflow
```bash
# Generate HTML report
npm test -- --coverage --coverageReporters=html

# Open in browser
open coverage/lcov-report/index.html

# Review uncovered lines
# Add tests for critical uncovered code
```

---

## 🎯 Current Test Status

```
✅ AudioSettings.test.tsx
   Location: tests/frontend/AudioSettings.test.tsx
   Tests: 34/34 passing
   Coverage: 81% lines, 94% branches

🔄 DraggableModal.test.tsx
   Location: tests/frontend/ (to be created)
   Tests: 0/39 (spec ready)
   Coverage: 0%
```

**Overall Project:**
- Test Suites: 1 passed
- Tests: 34 passed
- Time: ~1s
- Coverage: 3.42% (only 1 component tested so far)

---

## 🚨 Troubleshooting

### Tests Not Running
```bash
# Clear Jest cache
npm test -- --clearCache

# Then run tests
npm test
```

### Import Errors
```bash
# Check test file location
# Update import paths if moved files
# tests/frontend/ uses ../../src/
# tests/ uses ../src/
```

### Coverage Not Updating
```bash
# Clear coverage directory
rm -rf coverage/

# Run coverage again
npm run test:coverage
```

### Tests Hanging
```bash
# Find async issues
npm test -- --detectOpenHandles

# Set timeout
npm test -- --testTimeout=10000
```

---

## 📚 Additional Resources

- **Jest Documentation**: https://jestjs.io/
- **React Testing Library**: https://testing-library.com/react
- **Coverage Reports**: See `CODE_COVERAGE_REPORT.md`
- **Test Specifications**: See `*_test_specification.md` files

---

## ✨ Quick Start

**First time running tests?**
```bash
npm test
```

**Want to see coverage?**
```bash
npm run test:coverage
```

**Developing new features?**
```bash
npm run test:watch
```

That's it! 🎉

