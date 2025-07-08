import { FC } from 'react';

interface ReplyLoaderProps {
  avatar?: string;
}

export const ReplyLoader: FC<ReplyLoaderProps> = ({ avatar }) => (
  <div className="flex items-center gap-2 pr-[100px]">
    {/* <img
          src={avatar ?? DEFAULT_AVATAR_URL}
          className="w-8 h-8 rounded-full bg-cover bg-center border border-[#dfdfdf] border-solid"
        /> */}
    <div className="rounded-t-3xl rounded-br-3xl px-6 py-4">
      <div className="chat-loader" />
    </div>
  </div>
);
