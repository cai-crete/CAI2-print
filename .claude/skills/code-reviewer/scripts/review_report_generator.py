#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
"""
Review Report Generator - Combines PR analysis and code quality results
into a single Markdown review report.

Usage:
  # Analyze a local repo and write report to report.md
  python scripts/review_report_generator.py . --output report.md

  # Use pre-computed JSON results from other scripts
  python scripts/review_report_generator.py \
      --pr-json pr_results.json \
      --quality-json quality_results.json \
      --output report.md
"""

import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Import sibling scripts when running from the skills directory
import sys
sys.path.insert(0, str(Path(__file__).parent))

from pr_analyzer import PrAnalyzer
from code_quality_checker import scan_path


# ---------------------------------------------------------------------------
# Severity helpers
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {
    'security': 0, 'bug': 1, 'error_handling': 2,
    'complexity': 3, 'design': 4, 'typing': 5,
    'todo': 6, 'debug': 7, 'style': 8,
}

SEVERITY_EMOJI = {
    'security':      '🔴',
    'bug':           '🔴',
    'error_handling':'🟠',
    'complexity':    '🟡',
    'design':        '🟡',
    'typing':        '🟡',
    'todo':          '🔵',
    'debug':         '🔵',
    'style':         '⚪',
}


def _sev(category: str) -> int:
    return SEVERITY_ORDER.get(category, 9)


# ---------------------------------------------------------------------------
# Markdown builders
# ---------------------------------------------------------------------------

def _md_summary_table(pr: Optional[Dict], quality_files: int, quality_issues: List[Dict]) -> str:
    rows = []
    if pr:
        s = pr.get('summary', {})
        rows += [
            f"| Files changed  | {s.get('files_changed', '-')} |",
            f"| Lines added    | +{s.get('lines_added', 0)} |",
            f"| Lines removed  | -{s.get('lines_removed', 0)} |",
        ]
    rows += [
        f"| Files scanned  | {quality_files} |",
        f"| Quality issues | {len(quality_issues)} |",
    ]
    return "| Metric | Value |\n|--------|-------|\n" + '\n'.join(rows)


def _md_language_breakdown(lang: Dict) -> str:
    if not lang:
        return '_No language data._'
    lines = ['| Language | Files |', '|----------|-------|']
    for language, count in sorted(lang.items(), key=lambda x: -x[1]):
        lines.append(f'| {language} | {count} |')
    return '\n'.join(lines)


def _md_changed_files(files: List[Dict]) -> str:
    if not files:
        return '_No changed files._'
    lines = ['| Status | File | Language |', '|--------|------|----------|']
    for f in files:
        icon = {'added': '✅', 'modified': '✏️', 'deleted': '🗑️', 'renamed': '🔀'}.get(f['status'], '•')
        lines.append(f"| {icon} {f['status']} | `{f['path']}` | {f['language']} |")
    return '\n'.join(lines)


def _md_issues_section(issues: List[Dict], title: str) -> str:
    if not issues:
        return f'### {title}\n\n✅ No issues found.\n'

    by_cat: Dict[str, List] = {}
    for issue in sorted(issues, key=lambda x: (_sev(x.get('category', x.get('type', ''))),
                                                x['file'], x['line'])):
        cat = issue.get('category') or issue.get('type', 'other')
        by_cat.setdefault(cat, []).append(issue)

    lines = [f'### {title}\n']
    for cat in sorted(by_cat, key=_sev):
        items = by_cat[cat]
        emoji = SEVERITY_EMOJI.get(cat, '•')
        lines.append(f'#### {emoji} {cat.replace("_", " ").title()} ({len(items)})\n')
        lines.append('| File | Line | Message |')
        lines.append('|------|------|---------|')
        for item in items:
            msg = item.get('message', '')
            lines.append(f"| `{item['file']}` | {item['line']} | {msg} |")
        lines.append('')
    return '\n'.join(lines)


def _md_pr_issues(issues: List[Dict]) -> str:
    return _md_issues_section(issues, 'PR Diff Issues')


def _md_quality_issues(issues: List[Dict]) -> str:
    return _md_issues_section(issues, 'Code Quality Issues')


def _md_recommendations(pr_issues: List[Dict], quality_issues: List[Dict]) -> str:
    all_issues = pr_issues + quality_issues
    categories = {i.get('category') or i.get('type', '') for i in all_issues}

    recs = []
    if 'security' in categories:
        recs.append('- **Security**: Review hardcoded credentials and `eval()` usage immediately. '
                    'Rotate any exposed secrets and use environment variables or a secrets manager.')
    if 'bug' in categories:
        recs.append('- **Bugs**: Fix mutable default arguments and logic errors before merging.')
    if 'error_handling' in categories:
        recs.append('- **Error Handling**: Replace bare `except` / empty `catch` blocks with '
                    'specific exception types and proper logging.')
    if 'debug' in categories:
        recs.append('- **Debug Statements**: Remove all `console.log`, `print()`, and `debugger` '
                    'calls before merging to production.')
    if 'complexity' in categories:
        recs.append('- **Complexity**: Break down long functions (>50 lines) and deeply nested '
                    'blocks into smaller, focused units.')
    if 'todo' in categories:
        recs.append('- **TODOs**: Resolve or create tracked issues for all TODO/FIXME comments '
                    'rather than leaving them in the codebase.')
    if 'style' in categories:
        recs.append('- **Style**: Enforce line-length limits and trailing whitespace via a '
                    'formatter (Prettier, Black, gofmt) in CI.')
    if not recs:
        recs.append('- No critical issues found. Consider adding/updating tests for changed code.')
    return '\n'.join(recs)


# ---------------------------------------------------------------------------
# Report assembler
# ---------------------------------------------------------------------------

def build_report(
    pr_data: Optional[Dict],
    quality_issues: List[Dict],
    quality_files: int,
    repo_path: str,
) -> str:
    now = datetime.now().strftime('%Y-%m-%d %H:%M')
    pr_issues = pr_data.get('issues', []) if pr_data else []
    lang      = pr_data.get('language_breakdown', {}) if pr_data else {}
    files     = pr_data.get('changed_files', []) if pr_data else []

    sections = [
        f'# Code Review Report\n',
        f'**Repository:** `{repo_path}`  ',
        f'**Generated:** {now}\n',
        '---\n',

        '## Summary\n',
        _md_summary_table(pr_data, quality_files, quality_issues),
        '',

        '## Language Breakdown\n',
        _md_language_breakdown(lang),
        '',

        '## Changed Files\n',
        _md_changed_files(files),
        '',

        _md_pr_issues(pr_issues),
        _md_quality_issues(quality_issues),

        '## Recommendations\n',
        _md_recommendations(pr_issues, quality_issues),
        '',

        '---',
        '_Generated by `review_report_generator.py`_',
    ]
    return '\n'.join(sections)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Generate a Markdown code review report.'
    )
    parser.add_argument(
        'path', nargs='?', default='.',
        help='Git repo / directory to analyze (default: current directory)'
    )
    parser.add_argument(
        '--analyze', action='store_true',
        help='Run PR analysis + quality check then generate report (default when no --*-json given)'
    )
    parser.add_argument('--base', '-b', default='main',
                        help='Base branch for PR diff (default: main)')
    parser.add_argument('--pr-json',      help='Path to JSON output from pr_analyzer.py')
    parser.add_argument('--quality-json', help='Path to JSON output from code_quality_checker.py')
    parser.add_argument('--output', '-o', default='review_report.md',
                        help='Output Markdown file (default: review_report.md)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    args = parser.parse_args()

    target = Path(args.path).resolve()

    # --- Load or compute PR data ---
    pr_data: Optional[Dict] = None
    if args.pr_json:
        pr_data = json.loads(Path(args.pr_json).read_text())
        print(f'Loaded PR data from {args.pr_json}')
    elif args.analyze or not args.quality_json:
        if (target / '.git').exists():
            try:
                analyzer = PrAnalyzer(str(target), base=args.base, verbose=args.verbose)
                pr_data  = analyzer.run()
            except SystemExit as exc:
                print(f'PR analysis skipped: {exc}')
        else:
            print('No .git directory found -- skipping PR analysis.')

    # --- Load or compute quality data ---
    quality_issues: List[Dict] = []
    quality_files = 0
    if args.quality_json:
        payload        = json.loads(Path(args.quality_json).read_text())
        quality_issues = payload.get('issues', [])
        quality_files  = payload.get('files_scanned', 0)
        print(f'Loaded quality data from {args.quality_json}')
    else:
        print(f'\nRunning quality check on: {target}')
        quality_issues, quality_files = scan_path(target)

    # --- Build report ---
    report = build_report(pr_data, quality_issues, quality_files, str(target))

    out_path = Path(args.output)
    out_path.write_text(report, encoding='utf-8')
    print(f'\nReport written to: {out_path}')

    # Print a brief console summary
    total = len((pr_data or {}).get('issues', [])) + len(quality_issues)
    print(f'Total issues: {total}')


if __name__ == '__main__':
    main()