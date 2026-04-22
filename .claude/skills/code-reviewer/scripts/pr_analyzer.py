#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
"""
PR Analyzer - Analyzes git diffs and pull request changes.
Supports local git repositories. For GitHub PRs, requires the `gh` CLI.
"""

import re
import json
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

LANGUAGE_EXTENSIONS = {
    '.py': 'Python',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.go': 'Go',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.kts': 'Kotlin Script',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.rs': 'Rust',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
}

# Patterns that flag issues in added lines
ISSUE_PATTERNS = [
    (re.compile(r'\b(TODO|FIXME|HACK|XXX)\b'),         'todo',            'Unresolved TODO/FIXME comment'),
    (re.compile(r'console\.(log|warn|error|debug)\('), 'debug_statement', 'Debug console statement'),
    (re.compile(r'\bprint\s*\('),                       'debug_statement', 'Debug print statement'),
    (re.compile(r'\bfmt\.Print(ln|f)?\('),              'debug_statement', 'Debug fmt.Print statement'),
    (re.compile(r'\bdebugger\b'),                       'debug_statement', 'Debugger breakpoint left in code'),
    (re.compile(r'(password|secret|api_?key|token)\s*=\s*["\'][^"\']{4,}["\']', re.I),
                                                        'security',        'Possible hardcoded credential'),
    (re.compile(r'eval\s*\('),                          'security',        'Use of eval() is dangerous'),
    (re.compile(r'except\s*:'),                         'error_handling',  'Bare except clause catches everything'),
    (re.compile(r'catch\s*\(\s*\)'),                    'error_handling',  'Empty catch block'),
]

MAX_LINE_LENGTH = 120


class PrAnalyzer:
    def __init__(self, repo_path: str, base: str = 'main', verbose: bool = False):
        self.repo_path = Path(repo_path).resolve()
        self.base = base
        self.verbose = verbose
        self.results: Dict = {}

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def run(self) -> Dict:
        print(f"Analyzing changes against '{self.base}' in: {self.repo_path}")
        self._validate_repo()
        diff_stat, diff_names, diff_content = self._get_diff()
        self.results = {
            'repo': str(self.repo_path),
            'base': self.base,
            'summary': self._parse_summary(diff_stat),
            'changed_files': self._parse_file_list(diff_names),
            'issues': self._scan_issues(diff_content),
        }
        self.results['language_breakdown'] = self._count_by_language(
            self.results['changed_files']
        )
        self._print_report()
        return self.results

    # ------------------------------------------------------------------
    # Git helpers
    # ------------------------------------------------------------------

    def _validate_repo(self):
        if not (self.repo_path / '.git').exists():
            raise SystemExit(f"Not a git repository: {self.repo_path}")
        if self.verbose:
            print(f"  Repository: {self.repo_path}")

    def _git(self, *args) -> str:
        cmd = ['git', '-C', str(self.repo_path)] + list(args)
        try:
            return subprocess.check_output(cmd, stderr=subprocess.DEVNULL, text=True, encoding='utf-8', errors='replace').strip()
        except subprocess.CalledProcessError as exc:
            raise SystemExit(f"git command failed: {' '.join(cmd)}\n{exc}") from exc

    def _get_diff(self):
        # Try base...HEAD first; fall back to HEAD~1 if base branch doesn't exist
        refs = [f'{self.base}...HEAD', 'HEAD~1...HEAD']
        for ref in refs:
            try:
                stat    = self._git('diff', '--stat',        ref)
                names   = self._git('diff', '--name-status', ref)
                content = self._git('diff',                  ref)
                if self.verbose:
                    print(f"  Comparing: {ref}")
                return stat, names, content
            except SystemExit:
                continue
        raise SystemExit("Could not compute diff. Make sure the base branch or HEAD~1 exists.")

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    def _parse_summary(self, stat: str) -> Dict:
        files = added = removed = 0
        for line in stat.splitlines():
            m = re.search(r'(\d+) file', line)
            if m:
                files = int(m.group(1))
            m = re.search(r'(\d+) insertion', line)
            if m:
                added = int(m.group(1))
            m = re.search(r'(\d+) deletion', line)
            if m:
                removed = int(m.group(1))
        return {'files_changed': files, 'lines_added': added, 'lines_removed': removed}

    def _parse_file_list(self, names: str) -> List[Dict]:
        files = []
        status_map = {'A': 'added', 'M': 'modified', 'D': 'deleted', 'R': 'renamed', 'C': 'copied'}
        for line in names.splitlines():
            if not line.strip():
                continue
            parts = line.split('\t')
            status_char = parts[0][0]
            path = parts[-1]
            ext  = Path(path).suffix.lower()
            files.append({
                'path':     path,
                'status':   status_map.get(status_char, status_char),
                'language': LANGUAGE_EXTENSIONS.get(ext, 'Other'),
            })
        return files

    def _count_by_language(self, files: List[Dict]) -> Dict:
        counts: Dict[str, int] = {}
        for f in files:
            counts[f['language']] = counts.get(f['language'], 0) + 1
        return dict(sorted(counts.items(), key=lambda x: -x[1]))

    # ------------------------------------------------------------------
    # Issue scanner
    # ------------------------------------------------------------------

    def _scan_issues(self, diff_content: str) -> List[Dict]:
        issues: List[Dict] = []
        current_file: Optional[str] = None
        current_line = 0

        for raw_line in diff_content.splitlines():
            if raw_line.startswith('+++ b/'):
                current_file = raw_line[6:]
                current_line = 0
                continue
            if raw_line.startswith('@@'):
                m = re.search(r'\+(\d+)', raw_line)
                current_line = int(m.group(1)) - 1 if m else 0
                continue
            if raw_line.startswith('+') and not raw_line.startswith('+++'):
                current_line += 1
                code = raw_line[1:]
                for pattern, issue_type, message in ISSUE_PATTERNS:
                    if pattern.search(code):
                        issues.append({
                            'file':    current_file,
                            'line':    current_line,
                            'type':    issue_type,
                            'message': message,
                            'context': code.strip()[:80],
                        })
                if len(code) > MAX_LINE_LENGTH:
                    issues.append({
                        'file':    current_file,
                        'line':    current_line,
                        'type':    'style',
                        'message': f'Line too long ({len(code)} > {MAX_LINE_LENGTH} chars)',
                        'context': code.strip()[:80],
                    })
            elif not raw_line.startswith('-') and not raw_line.startswith('---'):
                current_line += 1

        return issues

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------

    def _print_report(self):
        s      = self.results['summary']
        issues = self.results['issues']
        lang   = self.results['language_breakdown']

        print('\n' + '=' * 60)
        print('PR ANALYSIS REPORT')
        print('=' * 60)
        print(f"Files changed : {s['files_changed']}")
        print(f"Lines added   : +{s['lines_added']}")
        print(f"Lines removed : -{s['lines_removed']}")

        if lang:
            print('\nLanguages:')
            for language, count in lang.items():
                print(f'  {language}: {count} file(s)')

        if issues:
            by_type: Dict[str, List] = {}
            for issue in issues:
                by_type.setdefault(issue['type'], []).append(issue)

            print(f'\nIssues found: {len(issues)}')
            for kind, items in sorted(by_type.items()):
                print(f'\n  [{kind.upper()}] ({len(items)})')
                for item in items[:5]:
                    print(f"    {item['file']}:{item['line']}  {item['message']}")
                    if self.verbose:
                        print(f"      -> {item['context']}")
                if len(items) > 5:
                    print(f'    ... and {len(items) - 5} more')
        else:
            print('\nNo issues found.')

        print('=' * 60)


def main():
    parser = argparse.ArgumentParser(
        description='Analyze PR / git diff changes for issues and metrics.'
    )
    parser.add_argument(
        'repo_path', nargs='?', default='.',
        help='Path to git repository (default: current directory)'
    )
    parser.add_argument(
        '--base', '-b', default='main',
        help='Base branch to compare against (default: main)'
    )
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--json',           action='store_true', help='Output results as JSON')
    parser.add_argument('--output', '-o',   help='Write JSON output to this file')
    args = parser.parse_args()

    analyzer = PrAnalyzer(args.repo_path, base=args.base, verbose=args.verbose)
    results  = analyzer.run()

    if args.json:
        payload = json.dumps(results, indent=2)
        if args.output:
            Path(args.output).write_text(payload)
            print(f'Results written to {args.output}')
        else:
            print(payload)


if __name__ == '__main__':
    main()