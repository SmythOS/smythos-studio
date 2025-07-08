import data from '@src/react/features/partners/data/partners.json';
import { FC } from 'react';
import { FaDollarSign, FaHeart, FaStar } from 'react-icons/fa';

const PartnersPage = () => {
  const iconsMap = {
    heart: FaHeart,
    star: FaStar,
    dollar: FaDollarSign,
  };
  return (
    <div className="sm-container pb-10 mx-auto">
      {data.map((partnersSection) => {
        return (
          <div className="mt-6" key={partnersSection.section_title}>
            <h2 className="text-3xl font-semibold">{partnersSection.section_title}</h2>

            <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {partnersSection.cards.map((partner) => {
                return (
                  <PartnerCard
                    key={partner.title}
                    partner={{
                      ...partner,
                      icon: partner.icon
                        ? {
                            color_class: partner.icon.color_class,
                            Component: iconsMap[partner.icon.Component],
                          }
                        : null,
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
type Partner = (typeof data)[0]['cards'][0] & {
  icon: { color_class: string; Component: FC<{ size: number; className: string }> };
};

const PartnerCard = ({ partner }: { partner: Partner }) => {
  const {
    icon: { color_class: iconClassNames, Component: Icon },
  } = partner;
  return (
    <div className="flex flex-col justify-between p-4 xl:h-[235px] lg:h-[260px] md:h-[220px] bg-white rounded-[8px] border border-solid border-gray-300 hover:shadow-md hover:border-primary-100 group">
      <div className="h-4/5">
        {partner.icon?.Component ? (
          <div className="mb-4">
            <Icon size={24} className={iconClassNames} />
          </div>
        ) : (
          <div className="mb-4">
            <FaStar size={24} className="text-yellow-400" />
          </div>
        )}
        <div>
          <h2
            title={partner.title}
            className="text-xl mb-1 overflow-hidden text-ellipsis whitespace-nowrap font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            {partner.title}
          </h2>
          {/* <p className="whitespace-pre-wrap mt-2 text-gray-700 text-sm">{partner.description}</p> */}
          <p
            className="whitespace-pre-wrap mt-2 text-gray-700 text-sm"
            dangerouslySetInnerHTML={{
              __html: partner.description,
            }}
          ></p>
        </div>
      </div>
      <div className={`flex justify-between mt-4 h-1/5 items-end gap-2 min-h-[28px]`}>
        <div className="flex space-x-2 text-one-line">
          {/*  @ts-ignore */}
          {partner.notes &&
            partner.notes?.map((category) => (
              <Pill key={category} item={category} handleCategoryClick={() => {}} />
            ))}
        </div>
        <a
          href={partner.claim.url}
          target="_blank"
          rel="noreferrer"
          className="text-white hidden text-one-line group-hover:flex items-center bg-primary-100 hover:opacity-75 focus:ring-4 focus:outline-none disabled:opacity-40 rounded-md text-sm px-5 py-1 text-center justify-center"
        >
          Claim in {partner.claim.app_name}
        </a>
      </div>
    </div>
  );
};

function Pill({ item, handleCategoryClick }) {
  return (
    <button
      onClick={() => handleCategoryClick(item.toLowerCase())}
      className={`px-4 py-1 rounded-full text-one-line group-hover: dark:border-gray-600 text-gray-900 dark:text-white text-xs bg-gray-200 font-semibold font-sans transition-colors duration-300`}
    >
      {item}
    </button>
  );
}

export default PartnersPage;
