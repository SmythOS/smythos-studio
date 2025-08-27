export interface IPageRoute {
  path: string;
  component: React.ComponentType<any>;
  skipAuth?: boolean;
  access?: {
    subscriptionBased?: boolean;
    checkAccess?: (subs: any) => boolean;
    UpsellContent?: React.ReactNode;
  };
  title?: string;
  layoutOptions?: {
    sidebar?: boolean;
    topMenu?: boolean;
    noScroll?: boolean;
    container?: boolean;
    useFullWidthLayout?: boolean;
    /**
     * Optional page background override for the content container.
     * Defaults to white when not provided.
     */
    background?: 'white' | 'agentsGradient';
  };

  render?: (res: any) => void;
}
