import { useEffect, useState } from 'react';
import { plugins, PluginTarget, PluginType } from './Plugins';


export const PluginComponents = ({targetId}: {targetId: PluginTarget}) => {
const [components, setComponents] = useState<React.ReactNode[]>([]);

useEffect(() => {
    const matchedPlugins = plugins.getPluginsByTarget(targetId, PluginType.Component) as {component: React.ReactNode}[];
    setComponents(matchedPlugins.map((plugin) => plugin.component));
}, [targetId]);

  
  
  return <>{components.map((component, index) => <div key={index}>{component}</div>)}</>;
};
