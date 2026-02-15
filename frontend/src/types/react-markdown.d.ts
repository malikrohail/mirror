declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';
  interface ReactMarkdownProps {
    children: string;
    remarkPlugins?: any[];
    className?: string;
    components?: Record<string, ComponentType<any>>;
    [key: string]: any;
  }
  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}
declare module 'remark-gfm' {
  const remarkGfm: any;
  export default remarkGfm;
}
