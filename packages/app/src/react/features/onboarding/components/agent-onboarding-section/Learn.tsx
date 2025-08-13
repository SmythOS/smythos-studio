import { LearnCard } from '@src/react/features/onboarding/components/agent-onboarding-section/LearnCard';
import { LearnCardProps } from '@src/react/shared/types/onboard.types';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';

const learnCards: LearnCardProps[] = [
  {
    image: '/img/onboard/note.png',
    title: 'Read Documentation',
    description:
      'Basics, Tutorials, Components, Integrations, Data, Deployment, Security, Advanced Topics, Best Practices, Troubleshooting, and more. ',
    link: SMYTHOS_DOCS_URL,
  },
  {
    image: '/img/onboard/life-ring.png',
    title: 'Community Support',
    description: 'Join Discord for live support from our team and thousands of agent engineers.',
    link: 'https://discord.gg/smythos',
    external: true,
  },
  {
    image: '/img/onboard/academy.png',
    title: 'Visit Academy',
    description: 'Access free courses and certifications to master building AI agents and boost your skills.',
    link: 'https://academy.smythos.com',
    external: true,
  },
];

export const Learn = () => {
  return (
    <div>
      <h3 className="text-lg">Learn SmythOS</h3>
      <div className="mt-4 flex flex-wrap gap-4">
        {learnCards.map((card) => (
          <LearnCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
};
