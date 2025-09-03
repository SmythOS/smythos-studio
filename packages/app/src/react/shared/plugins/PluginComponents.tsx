import { useEffect, useState } from 'react';
import { plugins, PluginTarget, PluginType, TPlugin } from './Plugins';

type PluginComponentsProps = {
  targetId: PluginTarget;
  props?: Record<string, any>;
};

export const PluginComponents = ({ targetId, props }: PluginComponentsProps) => {
  const [components, setComponents] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const allPlugins = plugins.getPluginsByTarget(targetId) as TPlugin[];

    const renderedComponents = allPlugins
      .map((plugin, index) => {
        if (plugin.type === PluginType.Function && props) {
          return plugin.function(props);
        }
        if (plugin.type === PluginType.Component) {
          return plugin.component;
        }
        return null;
      })
      .filter(Boolean);

    setComponents(renderedComponents);
  }, [targetId, props]);

  return (
    <>
      {components.map((component, index) => (
        <div key={index}>{component}</div>
      ))}
    </>
  );
};
