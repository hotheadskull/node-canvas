# Scope: E2E Testing Track

## Architecture
- **Target**: ReactFlow canvas, custom nodes (ThemeNode, ItemNode, LogicNode), custom edges (ElasticEdge), and CSS classes for the cosmic deep-space / Deadlock Matte Stone theme.
- **Testing Approach**: Opaque-box E2E testing of UI component exports, DOM rendering, and CSS rules.
- **Test Runner**: Vitest or a specialized JS DOM-based runner that runs TS/tsx tests without full browser overhead, ensuring clean exit codes and test reports.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1.1 | Test Infra Setup | Install/configure Vitest + JSDOM or custom test environment, setup scripts in `package.json`, create `tests/` folder. | None | PLANNED |
| M1.2 | Tier 1 Features | Implement >= 25 test cases covering F1-F5 feature requirements. | M1.1 | PLANNED |
| M1.3 | Tier 2 Boundaries | Implement >= 25 test cases covering boundary and corner inputs. | M1.2 | PLANNED |
| M1.4 | Tier 3 & 4 Cases | Implement >= 5 Tier 3 cross-feature tests & >= 5 Tier 4 scenarios. | M1.3 | PLANNED |
| M1.5 | Verification & Docs | Run test suite, verify clean exit codes, create `TEST_INFRA.md` and `TEST_READY.md`. | M1.4 | PLANNED |

## Interface Contracts
- Tests must target the exported components (`ThemeNode`, `ItemNode`, `LogicNode`, `ElasticEdge`, `FlowCanvas`) and CSS files (`src/App.css`, etc.).
- Testing must not modify any application files in `src/`.
