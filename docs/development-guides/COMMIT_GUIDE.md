# 📋 Commit Guide - FILTRA Project

## 🎯 Objective

This guide establishes the standard pattern for commit messages in the FILTRA project following the **BMAD-METHOD**. It maintains consistency in the commit history and facilitates tracking the progress of each story.

## 📊 Commit Pattern per Story

### **Typical Pattern (2 Commits)** ⭐ **MOST COMMON**

Most stories follow this simple pattern:

#### 1️⃣ **Story Creation**
```bash
feat(story-X.Y): create and refine [story name] story
```
**Examples:**
```bash
feat(story-1.1): create and refine CLI project scaffold story
feat(story-2.2): create and refine multilingual NER CPU-only story
feat(story-1.3): create and refine warm-up command story
```

#### 2️⃣ **Implementation and Final Approval**
```bash
feat(story-X.Y): complete [component] with QA fixes
```
**Examples:**
```bash
feat(story-1.1): complete CLI scaffold with QA fixes
feat(story-2.2): complete multilingual NER with QA fixes
feat(story-1.3): complete warm-up command with QA fixes
```

### **Complex Pattern (3+ Commits)** ⭐ **LESS COMMON**

Only for stories with multiple QA iterations:

#### 1️⃣ **Story Creation**
```bash
feat(story-X.Y): create and refine [story name] story
```

#### 2️⃣ **Initial Implementation**
```bash
feat(story-X.Y): implement [main component]
```

#### 3️⃣ **QA Fixes + Approval**
```bash
feat(story-X.Y): complete [component] with QA fixes
```

## 📅 Message Structure

### **Standard Format:**
```
type(story-X.Y): [brief action summary]

[Detailed body with categorized bullet points]
```

### **Title Format (First Line):**
- Keep under 50 characters when possible
- Focus on the main accomplishment
- Use action verbs: create, complete, finalize, implement

### **Body Format (After blank line):**
```
[Component/Feature Category]:
- [Specific detail 1]
- [Specific detail 2]

[Tests/QA Category]:
- [Test detail 1]
- [Test detail 2]

[Technical Details]:
- [Technical detail 1]
- [Technical detail 2]
```

### **Commit Types:**
- `feat:` - For new stories or significant advances
- `fix:` - For bug fixes
- `refactor:` - For internal restructuring
- `docs:` - For documentation changes

### **Examples by Story:**

#### **Story 1.1 (CLI Scaffold)**
```bash
feat(story-1.1): create and refine CLI project scaffold story
feat(story-1.1): complete CLI scaffold with QA fixes
```

#### **Story 1.2 (Health Checks)**
```bash
feat(story-1.2): create and refine health checks and exit codes story
feat(story-1.2): complete health checks implementation with QA fixes
```

#### **Story 1.3 (Warm-up)**
```bash
feat(story-1.3): create and refine warm-up command story
feat(story-1.3): complete warm-up command with QA fixes
```

#### **Story 2.1 (PDF Extraction)**
```bash
feat(story-2.1): create and refine PDF text extraction story
feat(story-2.1): complete PDF extraction with QA fixes
feat(story-2.1): finalize and approve PDF extraction story after full review cycle
```

#### **Story 2.2 (NER Multilingual)**
```bash
feat(story-2.2): create and refine multilingual NER CPU-only story
feat(story-2.2): complete multilingual NER with QA fixes
feat(story-2.2): refine and approve NER story to 10/10 quality
```

## ✅ Important Rules

### **When Commits Apply:**

1. **Creation:** Whenever a new story is created
2. **Implementation:** When technical implementation is completed
3. **QA Fixes:** When fixes identified by QA are applied
4. **Final Approval:** When the story is ready for production

### **Frequency:**
- **Simple stories:** 2 commits
- **Complex stories:** 3+ commits (only if there are multiple QA rounds)

### **Commit Content:**
- ✅ Include story files (`.md`)
- ✅ Include modified code files
- ✅ Include updated QA/gate files
- ✅ Use descriptive and specific messages

## 🚨 Common Mistakes to Avoid

❌ `feat(story-2.2): update files` - Too generic
❌ `feat(story-2.2): fix bugs` - Not specific
❌ `feat(story-2.2): work in progress` - Doesn't indicate concrete action

✅ `feat(story-2.2): complete multilingual NER with QA fixes` - Specific and clear

## 📈 Benefits of This Pattern

1. **Traceability:** Easy to follow the progress of each story
2. **Consistency:** The entire team follows the same format
3. **Debugging:** Quick to identify which story affected which changes
4. **Releases:** Facilitates preparation of release notes by story

## 🎯 Practical Example

For **Story 2.2 (NER Multilingual)** the complete flow would be:

```bash
# Day 1 - Creation
git commit -m "feat(story-2.2): create multilingual NER story

Story Components:
- ES/EN model support with Davlan/bert-base-multilingual-cased-ner-hrl
- --ner-model CLI flag for model override
- CPU-only execution with <200MB cache budget

Technical Requirements:
- HuggingFace pipeline integration
- Bilingual fixture preparation
- Cache path resolution and proxy support"

# Day 2-3 - Implementation + QA fixes
git commit -m "feat(story-2.2): complete NER implementation

Implementation Details:
- CPU-only HuggingFace NER pipeline with entity extraction
- CLI --ner-model flag validation and propagation
- Bilingual test fixtures for Spanish and English resumes

QA Fixes Applied:
- Registered pytest integration mark in pyproject.toml
- Added CLI regression tests for flag validation
- Enhanced cache diagnostics and proxy logging

Test Results:
- 37 tests passing, 1 skipped smoke test
- All acceptance criteria covered (AC 1, 2, 3)"

# Day 4 - Final approval
git commit -m "feat(story-2.2): approve NER story

QA Approval:
- Gate: PASS with 100% quality score
- All NFRs validated (Security, Performance, Reliability, Maintainability)
- Zero blocking issues identified

Final Metrics:
- 38 tests reviewed, all passing
- Complete acceptance criteria coverage
- No remaining technical debt"
```

### 📋 **How to Extract Details for Commit Bodies:**

#### **Story Components (from Acceptance Criteria):**
```markdown
## Acceptance Criteria
1. Default model supports ES/EN (e.g., `Davlan/bert-base-multilingual-cased-ner-hrl`)
2. First run downloads to cache (<~200MB total)
3. Integration test confirms entities extracted from Spanish and English resumes
```

#### **Technical Requirements (from Dev Notes):**
```markdown
## Dev Notes
- CPU-only HuggingFace NER pipeline with override support
- CLI flag validation and bilingual test coverage
- Cache path resolution and proxy-aware downloads
```

#### **QA Results (from Gate YAML):**
```yaml
gate: PASS
quality_score: 100
evidence:
  tests_reviewed: 38
  trace:
    ac_covered: [1, 2, 3]
    ac_gaps: []
```

### 📊 **Real Examples from FILTRA Project:**

#### **Story 1.1 (CLI Scaffold)**
```bash
# Creation
git commit -m "feat(story-1.1): create CLI scaffold story

Story Components:
- Windows-friendly CLI with pinned dependencies
- Help output and argument validation
- Exit code handling for different scenarios

Technical Requirements:
- Python 3.10+ compatibility
- Dependency pinning for Windows compatibility
- Error handling and logging setup"

# Completion
git commit -m "feat(story-1.1): complete CLI implementation

Implementation Details:
- CLI argument parsing with validation
- Help output formatting and display
- Exit code management for different error conditions

QA Fixes Applied:
- Enhanced error messages for invalid arguments
- Improved help text formatting
- Added quiet mode functionality

Test Results:
- All CLI functionality tests passing
- Exit code validation confirmed
- Help output formatting verified"
```

#### **Story 1.2 (Health Checks)**
```bash
# Creation
git commit -m "feat(story-1.2): create health checks story

Story Components:
- Health checks for help output validation
- Exit code verification for different scenarios
- Integration with existing CLI framework

Technical Requirements:
- Extend existing CLI test suite
- Validate argument parsing behavior
- Ensure consistent exit code handling"

# Completion
git commit -m "feat(story-1.2): complete health checks

Implementation Details:
- Extended existing CLI test suite
- Added health check validations
- Maintained backward compatibility

QA Fixes Applied:
- Enhanced test coverage for edge cases
- Improved error condition handling
- Added integration test scenarios

Test Results:
- All existing tests still passing
- New health check validations confirmed
- No regressions introduced"
```

#### **Story 2.1 (PDF Extraction)**
```bash
# Creation
git commit -m "feat(story-2.1): create PDF extraction story

Story Components:
- Local PDF processing capabilities
- Text extraction and preprocessing
- Integration with existing pipeline

Technical Requirements:
- PyMuPDF library integration
- Text normalization and cleaning
- Performance optimization for large files"

# Completion
git commit -m "feat(story-2.1): complete PDF processing

Implementation Details:
- PyMuPDF integration for PDF text extraction
- Text preprocessing and normalization pipeline
- Performance optimizations for large documents

QA Fixes Applied:
- Enhanced error handling for corrupted PDFs
- Added input validation for file types
- Improved text cleaning algorithms

Test Results:
- PDF extraction functionality verified
- Text preprocessing pipeline tested
- Performance benchmarks met"
```

### ✅ **Best Practices for Descriptive Commits:**

1. **Title (First Line):**
   - ✅ Keep under 50 characters
   - ✅ Use clear action verb: create/complete/finalize/approve
   - ✅ Focus on main accomplishment only

2. **Body Structure:**
   - ✅ **Story Components:** Extract from acceptance criteria
   - ✅ **Technical Requirements:** From Dev Notes and specifications
   - ✅ **Implementation Details:** What was actually built
   - ✅ **QA Fixes Applied:** Specific corrections made
   - ✅ **Test Results:** Metrics and validation outcomes

3. **Content Quality:**
   - ✅ Use bullet points for easy scanning
   - ✅ Include specific technical details (library names, file paths, metrics)
   - ✅ Reference acceptance criteria numbers when relevant
   - ✅ Mention test counts and quality scores
   - ✅ Keep categories clearly separated

### 🎯 **Quality Checklist for Commits:**

#### **Title Quality:**
- [ ] **Story reference:** `story-X.Y` format
- [ ] **Action verb:** create/complete/finalize/implement/approve
- [ ] **Brevity:** Under 50 characters
- [ ] **Clarity:** Main accomplishment is clear

#### **Body Quality:**
- [ ] **Structure:** Organized in logical categories
- [ ] **Details:** Extracted from story files and QA results
- [ ] **Specificity:** Concrete components and metrics included
- [ ] **Completeness:** All major aspects covered

#### **Overall Quality:**
- [ ] **Consistency:** Follows established pattern
- [ ] **Usefulness:** Provides value for debugging and releases
- [ ] **Accuracy:** Reflects actual work completed

### 🎯 **Complete Example - Story 2.2 Final Approval:**

```bash
feat(story-2.2): approve NER story

QA Approval:
- Gate: PASS with 100% quality score
- All NFRs validated (Security, Performance, Reliability, Maintainability)
- Zero blocking issues identified

Final Metrics:
- 38 tests reviewed, all passing
- Complete acceptance criteria coverage (AC 1, 2, 3)
- No remaining technical debt

Implementation Summary:
- CPU-only HuggingFace NER pipeline with entity extraction
- CLI --ner-model flag validation and propagation
- Bilingual test fixtures for Spanish and English resumes
- Enhanced cache diagnostics and proxy logging

QA Fixes Applied:
- Registered pytest integration mark in pyproject.toml
- Added CLI regression tests for flag validation
- Enhanced error handling for corrupted models

Test Results:
- 37 tests passing, 1 skipped smoke test
- All acceptance criteria covered
- Performance benchmarks met
```

**Title:** `feat(story-2.2): approve NER story` (38 chars)
**Body:** Detailed breakdown with categorized information

---
*📝 This guide is kept updated with each completed story to reflect the project's real patterns and ensure consistent, descriptive commit messages.*
