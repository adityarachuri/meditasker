# Copyright & License Scope

meditasker's **source code and documentation** are licensed under the MIT
License — see [LICENSE](LICENSE).

The MIT grant covers the code in this repository. It does **not** cover:

- **Data processed at runtime.** Any real user, account, task, or
  healthcare-insurance-context data held or logged by the in-memory data
  service (`src/services/databaseService.ts`) is not covered by the MIT
  grant. The code that stores and indexes that data is MIT-licensed; the
  data itself is not. All data shipped in this repository (`src/data/mockData.ts`
  and the demo accounts) is synthetic and provided for demonstration only.
- **The "meditasker" product name and branding.** The name is kept outside
  the MIT grant; MIT licenses the code, not the mark.

See [docs/meditasker-ip-licensing-guide.md](docs/meditasker-ip-licensing-guide.md)
for the full governance record, including the shared-domain note with
CompliHealth and the dependency license scan.
