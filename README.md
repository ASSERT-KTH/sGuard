## 1. Getting started

Clone the project to `project_folder/` and install dependencies

```bash
cd project_folder/
npm install
```

Install solc-select and select the corresponding compiler version:
```bash
pip install solc-select
```

## 2. Usage
First select the correcponding compiler version. Then run sGuard with the give file:
```bash
solc-select use SOLC_VERSION --always-install
npm run dev FILEPATH [CONTRACT_NAME]
```
CONTRACT_NAME is optional. If CONTRACT_NAME is not provided, sGuard assumes the last contract in the file as the main contract.

### Example

Patch `contracts/sample.sol`:
```bash
solc-select use 0.4.26 --always-install
npm run dev contracts/sample.sol
```
The fixed file is `contracts/sample.fixed.sol`
