import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { LearnCardProps } from '@src/react/shared/types/onboard.types';
import { FC } from 'react';
import { FaArrowRight } from 'react-icons/fa6';

export const LearnCard: FC<LearnCardProps> = ({ image, title, description, link }) => {
  return (
    <div className="border border-solid border-gray-300 rounded-lg p-3 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.33%-11px)] h-[162px] max-md:w-full relative">
      <div className="flex h-full gap-5">
        {/* Left section - Image */}
        <div className="flex items-center">
          <img src={image} alt={title} className="w-18 h-18" />
        </div>

        {/* Right section - Description and Button */}
        <div className="flex flex-col flex-1">
          <p className="text-sm text-gray-500 line-clamp-3">{description}</p>
          <CustomButton
            variant="secondary"
            isLink
            label={title}
            addIcon={true}
            Icon={<FaArrowRight className="inline-block ml-1" />}
            linkTo={link}
            iconPosition="right"
            className="self-end w-max mt-auto"
          />
        </div>
      </div>
    </div>
  );
};
