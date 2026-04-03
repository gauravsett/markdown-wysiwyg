import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface MathRenderResult {
  uri: vscode.Uri;
  width: string;        // CSS value, e.g. "55px"
  height: string;        // CSS value, e.g. "13px"
  verticalAlign: string; // CSS value from MathJax, e.g. "-0.186ex"
}

/**
 * Renders LaTeX math expressions to SVG files for use as contentIconPath.
 * Lazy-initializes MathJax on first render to avoid startup cost.
 * Caches results keyed by latex + theme kind, writes SVGs to temp files.
 */
export class MathRenderer implements vscode.Disposable {
  private adaptor: any;
  private html: any;
  private initialized = false;
  private cache = new Map<string, MathRenderResult>();
  private themeDisposable: vscode.Disposable;
  private tmpDir: string;

  constructor() {
    this.tmpDir = path.join(os.tmpdir(), 'markdown-wysiwyg-math');
    fs.mkdirSync(this.tmpDir, { recursive: true });

    this.themeDisposable = vscode.window.onDidChangeActiveColorTheme(() => {
      this.clearCache();
    });
  }

  private ensureInitialized(): void {
    if (this.initialized) { return; }

    const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
    const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
    const { TeX } = require('mathjax-full/js/input/tex.js');
    const { SVG } = require('mathjax-full/js/output/svg.js');
    const { mathjax } = require('mathjax-full/js/mathjax.js');
    // Register TeX packages individually (AllPackages pulls in mhchem →
    // mhchemparser, a separate npm dep we don't want to ship).
    require('mathjax-full/js/input/tex/base/BaseConfiguration.js');
    require('mathjax-full/js/input/tex/action/ActionConfiguration.js');
    require('mathjax-full/js/input/tex/ams/AmsConfiguration.js');
    require('mathjax-full/js/input/tex/amscd/AmsCdConfiguration.js');
    require('mathjax-full/js/input/tex/bbox/BboxConfiguration.js');
    require('mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js');
    require('mathjax-full/js/input/tex/braket/BraketConfiguration.js');
    require('mathjax-full/js/input/tex/bussproofs/BussproofsConfiguration.js');
    require('mathjax-full/js/input/tex/cancel/CancelConfiguration.js');
    require('mathjax-full/js/input/tex/cases/CasesConfiguration.js');
    require('mathjax-full/js/input/tex/centernot/CenternotConfiguration.js');
    require('mathjax-full/js/input/tex/color/ColorConfiguration.js');
    require('mathjax-full/js/input/tex/colorv2/ColorV2Configuration.js');
    require('mathjax-full/js/input/tex/colortbl/ColortblConfiguration.js');
    require('mathjax-full/js/input/tex/configmacros/ConfigMacrosConfiguration.js');
    require('mathjax-full/js/input/tex/empheq/EmpheqConfiguration.js');
    require('mathjax-full/js/input/tex/enclose/EncloseConfiguration.js');
    require('mathjax-full/js/input/tex/extpfeil/ExtpfeilConfiguration.js');
    require('mathjax-full/js/input/tex/gensymb/GensymbConfiguration.js');
    require('mathjax-full/js/input/tex/html/HtmlConfiguration.js');
    require('mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js');
    require('mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js');
    require('mathjax-full/js/input/tex/noerrors/NoErrorsConfiguration.js');
    require('mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js');
    require('mathjax-full/js/input/tex/physics/PhysicsConfiguration.js');
    require('mathjax-full/js/input/tex/setoptions/SetOptionsConfiguration.js');
    require('mathjax-full/js/input/tex/tagformat/TagFormatConfiguration.js');
    require('mathjax-full/js/input/tex/textcomp/TextcompConfiguration.js');
    require('mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js');
    require('mathjax-full/js/input/tex/upgreek/UpgreekConfiguration.js');
    require('mathjax-full/js/input/tex/unicode/UnicodeConfiguration.js');
    require('mathjax-full/js/input/tex/verb/VerbConfiguration.js');
    const texPackages = [
      'base', 'action', 'ams', 'amscd', 'bbox', 'boldsymbol', 'braket',
      'bussproofs', 'cancel', 'cases', 'centernot', 'color', 'colortbl',
      'empheq', 'enclose', 'extpfeil', 'gensymb', 'html', 'mathtools',
      'newcommand', 'noerrors', 'noundefined', 'upgreek', 'unicode', 'verb',
      'configmacros', 'tagformat', 'textcomp', 'textmacros',
    ];

    this.adaptor = liteAdaptor();
    RegisterHTMLHandler(this.adaptor);

    this.html = mathjax.document('', {
      InputJax: new TeX({ packages: texPackages }),
      OutputJax: new SVG({ fontCache: 'none' }),
    });

    this.initialized = true;
  }

  /**
   * Render a LaTeX string to a file-backed SVG for use as contentIconPath.
   * Returns the URI and pixel dimensions, or undefined if rendering fails.
   */
  render(latex: string): MathRenderResult | undefined {
    try {
      this.ensureInitialized();

      const themeKind = vscode.window.activeColorTheme.kind;
      const cacheKey = `${themeKind}:${latex}`;
      const cached = this.cache.get(cacheKey);
      if (cached) { return cached; }

      const fillColor = themeKind === vscode.ColorThemeKind.Light
        || themeKind === vscode.ColorThemeKind.HighContrastLight
        ? '#333333'
        : '#d4d4d4';

      const node = this.html.convert(latex, { display: false });
      let svg: string = this.adaptor.innerHTML(node);

      // Replace currentColor with theme-appropriate color so the SVG
      // renders correctly as a standalone image.
      svg = svg.replace(/currentColor/g, fillColor);

      // Extract vertical-align before stripping the style attribute.
      const vaMatch = svg.match(/vertical-align:\s*([-\d.]+ex)/);
      const verticalAlign = vaMatch ? vaMatch[1] : '0ex';

      // Strip the inline style (vertical-align is passed separately).
      svg = svg.replace(/style="[^"]*"/, '');

      // Convert ex units to pixels for icon sizing.
      const baseFontSize = vscode.workspace.getConfiguration('editor').get<number>('fontSize', 14);
      const exToPx = baseFontSize * 0.45;

      let widthPx = baseFontSize;
      let heightPx = baseFontSize;
      svg = svg.replace(/width="([\d.]+)ex"/, (_m: string, w: string) => {
        widthPx = Math.ceil(parseFloat(w) * exToPx);
        return `width="${widthPx}px"`;
      });
      svg = svg.replace(/height="([\d.]+)ex"/, (_m: string, h: string) => {
        heightPx = Math.ceil(parseFloat(h) * exToPx);
        return `height="${heightPx}px"`;
      });

      // Write to a temp file
      const hash = crypto.createHash('md5').update(cacheKey).digest('hex');
      const filePath = path.join(this.tmpDir, `${hash}.svg`);
      fs.writeFileSync(filePath, svg);

      const result: MathRenderResult = {
        uri: vscode.Uri.file(filePath),
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        verticalAlign,
      };
      this.cache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.error('[markdown-wysiwyg] MathRenderer error:', e);
      return undefined;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  dispose(): void {
    this.themeDisposable.dispose();
    this.cache.clear();
    try {
      fs.rmSync(this.tmpDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  }
}
