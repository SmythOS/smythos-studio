import Modal from '@react/shared/components/ui/modals/Modal';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { Datasource } from '@react/shared/types/api-results.types';
import { Progress } from 'flowbite-react';
import { FaRegCheckCircle, FaRegClock } from 'react-icons/fa'; // for pending and done
import { MdOutlineErrorOutline, MdOutlineLink } from 'react-icons/md'; // for failed

type Props = {
  onClose: () => void;
  item: Datasource;
  status: 'done' | 'pending' | 'indexing' | 'failed-retry' | 'failed' | 'done-duplicate' | null;
  lastCrawledAt: string;
  sitemapStatus?: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    nextCrawlAt?: string;
  } | null;
};

const DatasourceInfoModal = ({ onClose, item, sitemapStatus, status, lastCrawledAt }: Props) => {
  const processed = sitemapStatus?.total - sitemapStatus?.pending;
  const percentage = sitemapStatus ? Math.round((processed / sitemapStatus.total) * 100) : 0;
  const failed = sitemapStatus ? sitemapStatus.failed : 0;
  const pending = sitemapStatus ? sitemapStatus.pending : 0;
  const completed = sitemapStatus ? sitemapStatus.completed : 0;

  const formattedNextCrawlAt = sitemapStatus?.nextCrawlAt
    ? new Date(sitemapStatus.nextCrawlAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';
  const formattedLastCrawlAt = lastCrawledAt
    ? new Date(lastCrawledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <Modal title="Data Source Details" onClose={() => onClose()}>
      <div className="modal-body">
        <div className="flex flex-col gap-4">
          <div className="w-full pb-4">
            <div className="mt-4 flex flex-col gap-4">
              <p>
                <span className="font-bold">Name:</span> {item.name}
              </p>
              <p>
                <span className="font-bold">Source:</span>{' '}
                {item?.url?.startsWith('storage:') ? 'File Upload' : item?.url}
              </p>
              <p>
                <span className="font-bold">Last Crawl:</span>{' '}
                {status === 'done' || status === 'done-duplicate' ? formattedLastCrawlAt : 'N/A'}
              </p>
              <p>
                <span className="font-bold">Next Crawl:</span> {formattedNextCrawlAt}
              </p>
            </div>

            {item.type == 'SITEMAP' && (
              <>
                <Progress progress={percentage} className="mt-4 progress-bar-custom" color="blue" />
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center">
                    <FaRegClock className="text-primary" />
                    <span className="pl-2">Pending: {pending}</span>
                  </div>
                  <div className="flex items-center">
                    <FaRegCheckCircle className="text-primary" />
                    <span className="pl-2">Completed: {completed}</span>
                  </div>
                  <div className="flex items-center">
                    <MdOutlineErrorOutline className="text-primary" />
                    <span className="pl-2">Failed: {failed}</span>
                  </div>
                  <div className="flex items-center">
                    <MdOutlineLink className="text-primary" />
                    <span className="pl-2">Total: {sitemapStatus?.total}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end mt-8">
              <CustomButton label="Close" handleClick={() => onClose()} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DatasourceInfoModal;
