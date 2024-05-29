import csv
import os
import subprocess
import sys
import json
import time

def get_mid_dir(path):
    temp = path.replace(".sol", "")
    path_components = temp.split(os.path.sep)
    mid = path_components[-2:]
    return os.path.join(*mid)

def run_npm_dev(path, contract, outdir, stderr_file, stdout_file):
    command = f"npm run dev {path} {outdir} {contract}"

    with open(stdout_file, 'w') as stdout_f, open(stderr_file, 'w') as stderr_f:
        try:
            result = subprocess.run(command, shell=True, stdout=stdout_f, stderr=stderr_f, timeout=60*10)
        except subprocess.TimeoutExpired:
            return -1
    return result.returncode

def use_solc(version):

    use = f"solc-select use {version} --always-install"
    try:
        process = subprocess.run(use, shell=True, check=True)

        return process.returncode == 0
    except:
        return False

def process_entry(path, contract, outdir):

    mid = get_mid_dir(path)
    results_dir = outdir

    outdir = os.path.join(outdir, mid)
    os.makedirs(outdir, exist_ok=True)
    filename = path.split("/")[-1]
    stderr_file = os.path.join(outdir, filename.replace(".sol", ".log"))
    stdout_file = os.path.join(outdir, filename.replace(".sol", ".out"))

    return_code = run_npm_dev(path, contract, outdir, stderr_file, stdout_file)

    csv_file = os.path.join(results_dir, 'results.csv')
    with open(csv_file, 'a', newline='') as csvfile:
        fieldnames = ['path', 'contract', 'return_code']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writerow({
                'path': path,
                'contract': contract,
                'return_code': return_code
            })

def main():

    if len(sys.argv) != 3:
        print("Usage: python script.py <smartbugs_directory> <output_directory>")
        sys.exit(1)

    smartbugs_dir = sys.argv[1]
    output_dir = sys.argv[2]

    use_solc("0.4.24")

    # Load JSON file
    vuln_json = os.path.join(smartbugs_dir, "vulnerabilities.json")
    with open(vuln_json, 'r') as file:
        data = json.load(file)

    # Iterate over entries and call npm run dev
    for entry in data:
        path = os.path.join(smartbugs_dir, entry.get('path'))
        contract = entry.get('contract_names')[0]
        print(path)
        if path and contract:
            process_entry(path, contract, output_dir)
        else:
            print("Invalid entry in JSON:", entry)
        

if __name__ == "__main__":
    main()