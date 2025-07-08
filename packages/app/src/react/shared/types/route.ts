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
  };

  render?: (res: any) => void;
}
