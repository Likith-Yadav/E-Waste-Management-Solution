import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';

interface MarketplaceItemModalProps {
  item: {
    id: string;
    title: string;
    type: 'give' | 'take';
    price: number | 'free';
    description?: string;
    location: {
      address: string;
    };
    contact?: {
      email?: string;
      phone?: string;
    };
    userId?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MarketplaceItemModal({ item, isOpen, onClose }: MarketplaceItemModalProps) {
  if (!item) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  {item.title}
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      item.type === 'give' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.type === 'give' ? 'Giving Away' : 'Looking For'}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500">Price</p>
                    <p className="text-base text-gray-900">
                      {item.price === 'free' ? 'Free' : `₹${item.price}`}
                    </p>
                  </div>

                  {item.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-base text-gray-900">{item.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-base text-gray-900">{item.location.address}</p>
                  </div>

                  {item.contact && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact</p>
                      {item.contact.email && (
                        <p className="text-base text-gray-900">Email: {item.contact.email}</p>
                      )}
                      {item.contact.phone && (
                        <p className="text-base text-gray-900">Phone: {item.contact.phone}</p>
                      )}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 