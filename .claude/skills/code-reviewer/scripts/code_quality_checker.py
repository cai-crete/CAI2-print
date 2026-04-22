#!/usr/bin/env python3
"""
Code Quality Checker - Static analysis for TypeScript, JavaScript, Python, Go, Swift, Kotlin.
Detects common quality issues without requiring external linters.
"""

import re
import ast
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {
    '.py':   'python',
    '.ts':   'typescript',
    '.tsx':  'typescript',
    '.js':   'javascript',
    '.jsx':  'javascript',
    '.go':   'go',
    '.swift':'swift',
    '.kt':   'kotlin',
    '.kts':  'kotlin',
}

SKIP_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv',
    'dist', 'build', '.next', 'vendor', 'target',
}

MAX_FUNCTION_LINES  = 50
MAX_FILE_LINES      = 500
MAX_LINE_LENGTH     = 120
MAX_PARAMS          = 5
MAX_NESTING_DEPTH   = 4


# ---------------------------------------------------------------------------
# Language-agnostic text-based checks
# ---------------------------------------------------------------------------

def check_line_length(lines: List[str], filepath: str) -> List[Dict]:
    issues = []
    for i, line in enumerate(lines, 1):
        stripped = line.rstrip('\n')
        if len(stripped) > MAX_LINE_LENGTH:
            issues.append(_issue(filepath, i, 'style', 'line_too_long',
                                 f'Line length {len(stripped)} exceeds {MAX_LINE_LENGTH}'))
    return issues


def check_trailing_whitespace(lines: List[str], filepath: str) -> List[Dict]:
    issues = []
    for i, line in enumerate(lines, 1):
        if line != line.rstrip() and line.rstrip('\n') != '':
            issues.append(_issue(filepath, i, 'style', 'trailing_whitespace',
                                 'Trailing whitespace'))
    return issues


def check_todos(lines: List[str], filepath: str) -> List[Dict]:
    pattern = re.compile(r'\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)', re.I)
    issues = []
    for i, line in enumerate(lines, 1):
        m = pattern.search(line)
        if m:
            tag  = m.group(1).upper()
            note = m.group(2).strip()[:60]
            issues.append(_issue(filepath, i, 'todo', tag.lower(),
                                 f'{tag}: {note}' if note else tag))
    return issues


def check_debug_statements(lines: List[str], filepath: str, lang: str) -> List[Dict]:
    patterns_by_lang = {
        'python':     [re.compile(r'\bprint\s*\('), re.compile(r'\bbreakpoint\s*\('),
                       re.compile(r'\bpdb\.set_trace\s*\(')],
        'javascript': [re.compile(r'\bconsole\.(log|warn|error|debug|info)\s*\('),
                       re.compile(r'\bdebugger\b')],
        'typescript': [re.compile(r'\bconsole\.(log|warn|error|debug|info)\s*\('),
                       re.compile(r'\bdebugger\b')],
        'go':         [re.compile(r'\bfmt\.Print(ln|f)?\s*\(')],
        'swift':      [re.compile(r'\bprint\s*\(')],
        'kotlin':     [re.compile(r'\bprintln?\s*\(')],
    }
    issues = []
    for pat in patterns_by_lang.get(lang, []):
        for i, line in enumerate(lines, 1):
            # Skip comment lines
            stripped = line.strip()
            if stripped.startswith(('#', '//', '/*', '*')):
                continue
            if pat.search(line):
                issues.append(_issue(filepath, i, 'debug', 'debug_statement',
                                     'Debug statement left in code'))
    return issues


def check_hardcoded_secrets(lines: List[str], filepath: str) -> List[Dict]:
    pattern = re.compile(
        r'(password|secret|api_?key|token|auth|credential)\s*[=:]\s*["\'][^"\']{6,}["\']',
        re.I
    )
    issues = []
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith(('#', '//', '/*', '*')):
            continue
        if pattern.search(line):
            issues.append(_issue(filepath, i, 'security', 'hardcoded_secret',
                                 'Possible hardcoded credential or secret'))
    return issues


def check_nesting_depth(lines: List[str], filepath: str, lang: str) -> List[Dict]:
    """Estimate nesting depth via indentation changes (language-agnostic heuristic)."""
    if lang not in ('python', 'javascript', 'typescript', 'go', 'swift', 'kotlin'):
        return []
    issues = []
    indent_unit: Optional[int] = None
    for i, line in enumerate(lines, 1):
        stripped = line.lstrip()
        if not stripped or stripped.startswith(('#', '//', '/*', '*')):
            continue
        indent = len(line) - len(stripped)
        if indent > 0 and indent_unit is None:
            indent_unit = indent
        if indent_unit and indent_unit > 0:
            depth = indent // indent_unit
            if depth > MAX_NESTING_DEPTH:
                issues.append(_issue(filepath, i, 'complexity', 'deep_nesting',
                                     f'Nesting depth {depth} exceeds {MAX_NESTING_DEPTH}'))
    return issues


# ---------------------------------------------------------------------------
# Python-specific AST checks
# ---------------------------------------------------------------------------

def check_python_ast(source: str, filepath: str) -> List[Dict]:
    issues = []
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        issues.append(_issue(filepath, exc.lineno or 0, 'syntax', 'syntax_error',
                             f'Syntax error: {exc.msg}'))
        return issues

    for node in ast.walk(tree):
        # Long functions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            length = (node.end_lineno or node.lineno) - node.lineno
            if length > MAX_FUNCTION_LINES:
                issues.append(_issue(filepath, node.lineno, 'complexity', 'long_function',
                                     f"Function '{node.name}' is {length} lines "
                                     f"(limit: {MAX_FUNCTION_LINES})"))
            # Too many parameters
            n_args = len(node.args.args) + len(node.args.posonlyargs)
            if n_args > MAX_PARAMS:
                issues.append(_issue(filepath, node.lineno, 'design', 'too_many_params',
                                     f"Function '{node.name}' has {n_args} parameters "
                                     f"(limit: {MAX_PARAMS})"))

        # Bare except
        if isinstance(node, ast.ExceptHandler) and node.type is None:
            issues.append(_issue(filepath, node.lineno, 'error_handling', 'bare_except',
                                 'Bare except clause catches BaseException — be specific'))

        # Mutable default arguments
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for default in node.args.defaults:
                if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    issues.append(_issue(filepath, node.lineno, 'bug', 'mutable_default',
                                         f"Function '{node.name}' uses mutable default argument"))

        # == None instead of is None
        if isinstance(node, ast.Compare):
            for op, comp in zip(node.ops, node.comparators):
                if isinstance(op, (ast.Eq, ast.NotEq)) and isinstance(comp, ast.Constant) and comp.value is None:
                    issues.append(_issue(filepath, node.lineno, 'style', 'equality_none',
                                         "Use 'is None' / 'is not None' instead of == / !="))

    return issues


# ---------------------------------------------------------------------------
# JS/TS text-based checks
# ---------------------------------------------------------------------------

def check_js_ts(lines: List[str], filepath: str) -> List[Dict]:
    issues = []
    var_pattern   = re.compile(r'\bvar\s+\w')
    any_type      = re.compile(r':\s*any\b')
    empty_catch   = re.compile(r'catch\s*\([^)]*\)\s*\{\s*\}')
    eval_pat      = re.compile(r'\beval\s*\(')

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith(('*', '//')):
            continue
        if var_pattern.search(line):
            issues.append(_issue(filepath, i, 'style', 'use_var',
                                 "Use 'const' or 'let' instead of 'var'"))
        if any_type.search(line) and filepath.endswith(('.ts', '.tsx')):
            issues.append(_issue(filepath, i, 'typing', 'explicit_any',
                                 "Avoid explicit 'any' type — use a specific type or 'unknown'"))
        if eval_pat.search(line):
            issues.append(_issue(filepath, i, 'security', 'eval_usage',
                                 "Avoid eval() — it executes arbitrary code"))

    # Multiline: empty catch blocks
    source = '\n'.join(lines)
    for m in empty_catch.finditer(source):
        lineno = source[:m.start()].count('\n') + 1
        issues.append(_issue(filepath, lineno, 'error_handling', 'empty_catch',
                             'Empty catch block silently swallows errors'))

    return issues


# ---------------------------------------------------------------------------
# Go text-based checks
# ---------------------------------------------------------------------------

def check_go(lines: List[str], filepath: str) -> List[Dict]:
    issues = []
    ignored_err = re.compile(r'_\s*=\s*\w+\.\w+\(')  # _ = something.Call(
    panic_pat   = re.compile(r'\bpanic\s*\(')

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('//'):
            continue
        if ignored_err.search(line):
            issues.append(_issue(filepath, i, 'error_handling', 'ignored_error',
                                 'Error return value is explicitly ignored with _'))
        if panic_pat.search(line):
            issues.append(_issue(filepath, i, 'error_handling', 'panic_usage',
                                 "Avoid panic() in library code — return an error instead"))

    return issues


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def check_file(filepath: Path) -> List[Dict]:
    lang = SUPPORTED_EXTENSIONS.get(filepath.suffix.lower())
    if not lang:
        return []

    try:
        source = filepath.read_text(encoding='utf-8', errors='replace')
    except OSError:
        return []

    lines  = source.splitlines(keepends=True)
    path   = str(filepath)
    issues: List[Dict] = []

    # File-level
    if len(lines) > MAX_FILE_LINES:
        issues.append(_issue(path, 1, 'complexity', 'large_file',
                             f'File has {len(lines)} lines (limit: {MAX_FILE_LINES})'))

    # Universal checks
    issues += check_line_length(lines, path)
    issues += check_trailing_whitespace(lines, path)
    issues += check_todos(lines, path)
    issues += check_debug_statements(lines, path, lang)
    issues += check_hardcoded_secrets(lines, path)
    issues += check_nesting_depth(lines, path, lang)

    # Language-specific checks
    if lang == 'python':
        issues += check_python_ast(source, path)
    elif lang in ('javascript', 'typescript'):
        issues += check_js_ts(lines, path)
    elif lang == 'go':
        issues += check_go(lines, path)

    return issues


def scan_path(target: Path) -> Tuple[List[Dict], int]:
    all_issues: List[Dict] = []
    files_scanned = 0

    if target.is_file():
        all_issues = check_file(target)
        files_scanned = 1
    else:
        for fpath in sorted(target.rglob('*')):
            if any(skip in fpath.parts for skip in SKIP_DIRS):
                continue
            if fpath.is_file() and fpath.suffix.lower() in SUPPORTED_EXTENSIONS:
                all_issues += check_file(fpath)
                files_scanned += 1

    return all_issues, files_scanned


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _issue(filepath: str, line: int, category: str, code: str, message: str) -> Dict:
    return {
        'file':     filepath,
        'line':     line,
        'category': category,
        'code':     code,
        'message':  message,
    }


def _severity_order(category: str) -> int:
    return {'security': 0, 'bug': 1, 'error_handling': 2,
            'complexity': 3, 'design': 4, 'typing': 5,
            'todo': 6, 'debug': 7, 'style': 8}.get(category, 9)


# ---------------------------------------------------------------------------
# Report printer
# ---------------------------------------------------------------------------

def print_report(issues: List[Dict], files_scanned: int, verbose: bool = False):
    issues_sorted = sorted(issues, key=lambda x: (_severity_order(x['category']),
                                                   x['file'], x['line']))
    by_category: Dict[str, List] = {}
    for issue in issues_sorted:
        by_category.setdefault(issue['category'], []).append(issue)

    print('\n' + '=' * 60)
    print('CODE QUALITY REPORT')
    print('=' * 60)
    print(f'Files scanned : {files_scanned}')
    print(f'Total issues  : {len(issues)}')

    if issues:
        print()
        for cat in sorted(by_category, key=_severity_order):
            items = by_category[cat]
            print(f'  [{cat.upper()}]  ({len(items)} issue(s))')
            shown = items if verbose else items[:5]
            for item in shown:
                print(f"    {item['file']}:{item['line']}  [{item['code']}]  {item['message']}")
            if not verbose and len(items) > 5:
                print(f'    ... and {len(items) - 5} more  (use --verbose to see all)')
            print()
    else:
        print('\nNo issues found — great work!')

    print('=' * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Static code quality checker for TS, JS, Python, Go, Swift, Kotlin.'
    )
    parser.add_argument('target', help='File or directory to analyze')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show all issues (not just first 5 per category)')
    parser.add_argument('--json',          action='store_true', help='Output results as JSON')
    parser.add_argument('--output', '-o',  help='Write JSON output to this file')
    args = parser.parse_args()

    target = Path(args.target)
    if not target.exists():
        raise SystemExit(f"Path does not exist: {target}")

    print(f'Scanning: {target}')
    issues, files_scanned = scan_path(target)

    if not args.json:
        print_report(issues, files_scanned, verbose=args.verbose)

    if args.json:
        payload = json.dumps({'files_scanned': files_scanned, 'issues': issues}, indent=2)
        if args.output:
            Path(args.output).write_text(payload)
            print(f'Results written to {args.output}')
        else:
            print(payload)


if __name__ == '__main__':
    main()