const pathPolyfill = {
  resolve: (...args: string[]) => args.filter(Boolean).join('/').replace(/\/+/g, '/'),
  join: (...args: string[]) => args.filter(Boolean).join('/').replace(/\/+/g, '/'),
  dirname: (p: string) => (p || '').split('/').slice(0, -1).join('/') || '/',
  basename: (p: string, ext?: string) => {
    let b = (p || '').split('/').pop() || '';
    if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length);
    return b;
  },
  extname: (p: string) => {
    const b = (p || '').split('/').pop() || '';
    const idx = b.lastIndexOf('.');
    return idx > 0 ? b.slice(idx) : '';
  },
  normalize: (p: string) => p,
  isAbsolute: (p: string) => (p || '').startsWith('/'),
  relative: (_from: string, to: string) => to,
  sep: '/',
  delimiter: ':',
  default: null as any,
};
pathPolyfill.default = pathPolyfill;

export default pathPolyfill;
export const resolve = pathPolyfill.resolve;
export const join = pathPolyfill.join;
export const dirname = pathPolyfill.dirname;
export const basename = pathPolyfill.basename;
export const extname = pathPolyfill.extname;
export const normalize = pathPolyfill.normalize;
export const isAbsolute = pathPolyfill.isAbsolute;
export const relative = pathPolyfill.relative;
export const sep = pathPolyfill.sep;
export const delimiter = pathPolyfill.delimiter;
