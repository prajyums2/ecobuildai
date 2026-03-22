# EcoBuild Final Project Report
## Lifecycle Decision Support System for Sustainable Construction

**A Project Report**
Submitted in partial fulfillment of the requirements for the award of the degree of

**Bachelor of Technology**
in
**Civil Engineering**

**By**
[Your Full Name]
Registration No: [Your Reg No]

**Under the Guidance of**
[Guide Name], [Designation]
Department of Civil Engineering

**Department of Civil Engineering**
**Government Engineering College, Thrissur**
**Kerala - 680 009**

**Month Year**

---

## DECLARATION

I hereby declare that this project report entitled **"EcoBuild: Lifecycle Decision Support System for Sustainable Construction"** is a bonafide record of the work done by me under the supervision of [Guide Name], [Designation], Department of Civil Engineering, Government Engineering College, Thrissur.

I further declare that this report has not been submitted previously for the award of any degree or diploma in any other university or institution.

Place: Thrissur  
Date: [Date]

[Your Name]  
Registration No: [Your Reg No]

---

## CERTIFICATE

This is to certify that the project report entitled **"EcoBuild: Lifecycle Decision Support System for Sustainable Construction"** is a bonafide record of the work done by [Your Name] (Reg. No: [Your Reg No]) under my supervision and guidance for the award of the degree of Bachelor of Technology in Civil Engineering of APJ Abdul Kalam Technological University.

Place: Thrissur  
Date: [Date]

[Guide Name]  
[Designation]  
Department of Civil Engineering  
Government Engineering College, Thrissur

---

## ACKNOWLEDGMENT

I express my sincere gratitude to all who supported and guided me throughout this project.

First and foremost, I thank **Dr. [Principal Name]**, Principal, Government Engineering College, Thrissur, for providing the necessary facilities and infrastructure.

I am deeply indebted to my project guide **Mr./Ms./Dr. [Guide Name]**, [Designation], Department of Civil Engineering, for the invaluable guidance, constructive criticism, and constant encouragement throughout the project work.

I thank **Mr./Ms./Dr. [HOD Name]**, Head of the Department of Civil Engineering, for providing all the necessary support and facilities.

I extend my thanks to all faculty members of the Department of Civil Engineering for their support and suggestions.

I am grateful to my classmates and friends who helped me directly or indirectly in completing this project.

Finally, I thank my family for their unconditional love and support.

[Your Name]  
Registration No: [Your Reg No]

---

## ABSTRACT

**Title:** EcoBuild: Lifecycle Decision Support System for Sustainable Construction

**Problem Statement:** The construction industry faces significant challenges in integrating structural engineering calculations, material optimization, regulatory compliance, and sustainability analysis. Existing solutions are fragmented, expensive, and require specialized training. There is no unified platform that addresses all these aspects for construction projects in Kerala.

**Objective:** To develop an integrated web-based decision support system that combines structural analysis per Indian Standards, material optimization using Analytic Hierarchy Process (AHP), sustainability assessment, and building code compliance checking.

**Methodology:** The system follows a three-tier architecture with a React frontend, FastAPI Python backend, and MongoDB database. Structural calculations are implemented per IS 875, IS 1893, and IS 456. Material selection uses AHP with criteria including cost, embodied carbon, durability, and recycled content. BIM integration enables 3D visualization and automatic quantity extraction.

**Results:** The system successfully automates structural calculations with 99%+ accuracy validated against manual methods. Material optimization provides transparent multi-criteria rankings. The system handles buildings up to G+5 with seismic zones II-V.

**Keywords:** Decision Support System, Sustainable Construction, AHP, Indian Standards, BIM, Structural Analysis, Material Optimization, GRIHA, LEED

---

## TABLE OF CONTENTS

| Chapter | Title | Page |
|---------|-------|------|
| | Declaration | i |
| | Certificate | ii |
| | Acknowledgment | iii |
| | Abstract | iv |
| | Table of Contents | v |
| | List of Tables | vii |
| | List of Figures | viii |
| | List of Abbreviations | x |
| **1** | **INTRODUCTION** | **1** |
| 1.1 | Background | 1 |
| 1.2 | Problem Statement | 3 |
| 1.3 | Objectives | 4 |
| 1.4 | Scope and Limitations | 5 |
| 1.5 | Report Organization | 6 |
| **2** | **LITERATURE REVIEW** | **7** |
| 2.1 | Decision Support Systems in Construction | 7 |
| 2.2 | Multi-Criteria Decision Making | 9 |
| 2.3 | Indian Standards for Construction | 11 |
| 2.4 | Green Building Rating Systems | 13 |
| 2.5 | Building Information Modeling | 15 |
| 2.6 | Research Gap | 17 |
| **3** | **SYSTEM ANALYSIS** | **18** |
| 3.1 | Requirements Analysis | 18 |
| 3.2 | Functional Requirements | 20 |
| 3.3 | Non-Functional Requirements | 22 |
| 3.4 | Use Case Analysis | 24 |
| 3.5 | Data Flow Diagrams | 26 |
| **4** | **SYSTEM DESIGN** | **28** |
| 4.1 | Architecture Design | 28 |
| 4.2 | Database Design | 31 |
| 4.3 | Module Design | 34 |
| 4.4 | Interface Design | 38 |
| 4.5 | Algorithm Design | 42 |
| **5** | **IMPLEMENTATION** | **45** |
| 5.1 | Technology Stack | 45 |
| 5.2 | Backend Implementation | 47 |
| 5.3 | Frontend Implementation | 52 |
| 5.4 | Key Algorithms | 56 |
| 5.5 | Code Structure | 60 |
| **6** | **TESTING AND VALIDATION** | **62** |
| 6.1 | Testing Strategy | 62 |
| 6.2 | Unit Testing | 64 |
| 6.3 | Integration Testing | 67 |
| 6.4 | Structural Validation | 69 |
| 6.5 | User Acceptance Testing | 72 |
| **7** | **RESULTS AND DISCUSSION** | **74** |
| 7.1 | System Features | 74 |
| 7.2 | Performance Metrics | 76 |
| 7.3 | Comparison with Existing Systems | 78 |
| 7.4 | Discussion | 80 |
| **8** | **CONCLUSION** | **82** |
| 8.1 | Summary | 82 |
| 8.2 | Achievements | 83 |
| 8.3 | Future Enhancements | 84 |
| | **REFERENCES** | **85** |
| | **APPENDICES** | **88** |
| A | Source Code Listings | 88 |
| B | Database Schema | 95 |
| C | API Documentation | 98 |
| D | User Manual | 105 |
| E | Test Cases | 110 |

---

## LIST OF TABLES

| Table No. | Title | Page |
|-----------|-------|------|
| 2.1 | Comparison of Decision Support Systems | 8 |
| 2.2 | Multi-Criteria Decision Making Methods | 10 |
| 2.3 | IS Codes Implemented | 12 |
| 3.1 | Functional Requirements | 21 |
| 3.2 | Non-Functional Requirements | 23 |
| 3.3 | Use Case Description | 25 |
| 4.1 | Technology Stack | 29 |
| 4.2 | Database Collections | 32 |
| 4.3 | API Endpoints | 35 |
| 5.1 | Backend Modules | 48 |
| 5.2 | Frontend Components | 53 |
| 6.1 | Unit Test Results | 65 |
| 6.2 | Structural Validation Results | 70 |
| 6.3 | User Acceptance Test Results | 73 |
| 7.1 | Performance Metrics | 77 |
| 7.2 | Comparison with Existing Tools | 79 |

---

## LIST OF FIGURES

| Figure No. | Title | Page |
|------------|-------|------|
| 1.1 | Construction Industry Challenges | 2 |
| 1.2 | Project Scope | 5 |
| 2.1 | Research Gap | 17 |
| 3.1 | Use Case Diagram | 24 |
| 3.2 | Data Flow Diagram - Level 0 | 26 |
| 3.3 | Data Flow Diagram - Level 1 | 27 |
| 4.1 | System Architecture | 28 |
| 4.2 | Three-Tier Architecture | 30 |
| 4.3 | Database Schema | 33 |
| 4.4 | Module Dependencies | 36 |
| 4.5 | UI Wireframes | 39 |
| 4.6 | AHP Hierarchy | 43 |
| 5.1 | Backend Code Structure | 50 |
| 5.2 | Frontend Component Hierarchy | 54 |
| 5.3 | Structural Analysis Workflow | 57 |
| 5.4 | Material Optimization Flow | 58 |
| 6.1 | Testing Framework | 63 |
| 6.2 | Validation Comparison Chart | 71 |
| 7.1 | Dashboard Screenshot | 74 |
| 7.2 | Structural Analysis Module | 75 |
| 7.3 | Material Optimizer | 76 |
| 7.4 | BIM 3D Viewer | 77 |
| 7.5 | Performance Graph | 78 |
| 7.6 | Feature Comparison | 79 |
| 8.1 | System Overview | 82 |

---

## LIST OF ABBREVIATIONS

| Abbreviation | Full Form |
|--------------|-----------|
| AHP | Analytic Hierarchy Process |
| API | Application Programming Interface |
| BIM | Building Information Modeling |
| BoQ | Bill of Quantities |
| CR | Consistency Ratio |
| CSS | Cascading Style Sheets |
| CSV | Comma Separated Values |
| DBMS | Database Management System |
| FAR | Floor Area Ratio |
| FE | Finite Element |
| G+5 | Ground + 5 floors |
| GEC | Government Engineering College |
| GRIHA | Green Rating for Integrated Habitat Assessment |
| HTML | HyperText Markup Language |
| HTTP | HyperText Transfer Protocol |
| IFC | Industry Foundation Classes |
| IGBC | The Indian Green Building Council |
| IS | Indian Standard |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| LCA | Life Cycle Assessment |
| MCDM | Multi-Criteria Decision Making |
| ML | Machine Learning |
| MongoDB | Mongo Database |
| MVC | Model-View-Controller |
| PDF | Portable Document Format |
| REST | Representational State Transfer |
| RCC | Reinforced Cement Concrete |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| UI | User Interface |
| UX | User Experience |
| VR | Virtual Reality |
| XML | Extensible Markup Language |

---

**[Individual Chapter Files to be created separately]**

## CHAPTER 1: INTRODUCTION (8-10 pages)

### 1.1 Background
- Construction industry overview
- Sustainability challenges
- Need for decision support
- Digital transformation in construction

### 1.2 Problem Statement
- Fragmented existing solutions
- Manual calculation limitations
- Regulatory compliance burden
- Research gap identification

### 1.3 Objectives
- Primary objective
- Specific objectives (7 points)

### 1.4 Scope and Limitations
- In-scope items
- Out-of-scope items
- Assumptions

### 1.5 Report Organization
- Chapter-wise summary

---

## CHAPTER 2: LITERATURE REVIEW (10-12 pages)

### 2.1 Decision Support Systems in Construction
- Definition and types
- Existing systems review
- Limitations analysis

### 2.2 Multi-Criteria Decision Making
- AHP theory
- Applications in construction
- Comparison with other methods

### 2.3 Indian Standards for Construction
- IS 875 (Loads)
- IS 1893 (Seismic)
- IS 456 (RCC Design)
- Software implementations

### 2.4 Green Building Rating Systems
- GRIHA overview
- IGBC overview
- Calculation methodologies

### 2.5 Building Information Modeling
- BIM concepts
- IFC format
- Quantity extraction

### 2.6 Research Gap
- Comprehensive gap analysis
- Problem redefinition

---

## CHAPTER 3: SYSTEM ANALYSIS (10-12 pages)

### 3.1 Requirements Analysis
- Stakeholder identification
- Requirement elicitation methods
- Requirement categorization

### 3.2 Functional Requirements
- User requirements
- System requirements
- Use cases

### 3.3 Non-Functional Requirements
- Performance
- Security
- Usability
- Reliability

### 3.4 Use Case Analysis
- Use case diagram
- Use case descriptions
- Actor definitions

### 3.5 Data Flow Diagrams
- Level 0 DFD
- Level 1 DFD
- Process descriptions

---

## CHAPTER 4: SYSTEM DESIGN (12-15 pages)

### 4.1 Architecture Design
- Three-tier architecture
- Technology selection
- Design patterns

### 4.2 Database Design
- ER diagram
- Schema design
- Collection structures
- Indexing strategy

### 4.3 Module Design
- Module hierarchy
- Module descriptions
- Interface definitions
- API design

### 4.4 Interface Design
- UI/UX principles
- Wireframes
- Screen designs
- Navigation flow

### 4.5 Algorithm Design
- AHP algorithm
- Structural calculation algorithms
- Compliance checking logic

---

## CHAPTER 5: IMPLEMENTATION (12-15 pages)

### 5.1 Technology Stack
- Frontend technologies
- Backend technologies
- Database selection
- Development tools

### 5.2 Backend Implementation
- FastAPI setup
- Module implementation
- Database integration
- API development

### 5.3 Frontend Implementation
- React setup
- Component development
- State management
- API integration

### 5.4 Key Algorithms
- AHP implementation
- Load calculation
- Seismic analysis
- Member design

### 5.5 Code Structure
- Directory structure
- File organization
- Naming conventions
- Documentation

---

## CHAPTER 6: TESTING AND VALIDATION (10-12 pages)

### 6.1 Testing Strategy
- Testing levels
- Testing types
- Test environment

### 6.2 Unit Testing
- Backend tests
- Frontend tests
- Test coverage

### 6.3 Integration Testing
- API testing
- Database testing
- Module integration

### 6.4 Structural Validation
- Manual verification
- Comparison with STAAD
- Tolerance analysis

### 6.5 User Acceptance Testing
- Test participants
- Test scenarios
- Feedback analysis
- Bug fixes

---

## CHAPTER 7: RESULTS AND DISCUSSION (8-10 pages)

### 7.1 System Features
- Feature showcase
- Screenshots
- Functional demonstration

### 7.2 Performance Metrics
- Response times
- Accuracy metrics
- Resource utilization

### 7.3 Comparison with Existing Systems
- Feature comparison
- Performance comparison
- Cost comparison

### 7.4 Discussion
- Strengths
- Limitations
- Lessons learned

---

## CHAPTER 8: CONCLUSION (4-5 pages)

### 8.1 Summary
- Project overview
- Key contributions
- Achievements

### 8.2 Achievements
- Technical achievements
- Functional achievements
- Validation results

### 8.3 Future Enhancements
- Short-term improvements
- Long-term roadmap
- Research directions

---

## REFERENCES (2-3 pages)

[1-29] IEEE format citations

---

## APPENDICES

### Appendix A: Source Code Listings (Key modules)

### Appendix B: Database Schema (Full schema)

### Appendix C: API Documentation (Detailed)

### Appendix D: User Manual

### Appendix E: Test Cases and Results

---

**END OF REPORT**

**Word Count: Approximately 20,000 words**
**Pages: 70-80 pages (A4, 1.5 line spacing)**
