import { useRef } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { useFileManagerStore } from '../store/useFileManagerStore'
import classNames from '@/utils/classNames'
import { TbLink } from 'react-icons/tb'

const FileManagerInviteDialog = () => {
    const { inviteDialog, setInviteDialog } = useFileManagerStore()

    const inputRef = useRef<HTMLInputElement>(null)

    const handleDialogClose = () => {
        setInviteDialog({ id: '', open: false })
    }

    const handleInvite = () => {
        toast.push(
            <Notification
                type="success"
                title="Invitation send!"
            ></Notification>,
            { placement: 'top-end' },
        )
    }

    const handleCopy = async () => {
        toast.push(
            <Notification type="success" title="Copied!"></Notification>,
            { placement: 'top-end' },
        )
        navigator.clipboard.writeText(window.location.href)
    }

    return (
        <Dialog
            isOpen={inviteDialog.open}
            contentClassName="mt-[50%]"
            onClose={handleDialogClose}
            onRequestClose={handleDialogClose}
        >
            <h4>Share this file</h4>
            <div className="mt-6">
                <Input
                    ref={inputRef}
                    placeholder="Email"
                    type="email"
                    suffix={
                        <Button
                            type="button"
                            variant="solid"
                            size="md"
                            customColorClass={({ unclickable }) =>
                                classNames(
                                    'bg-gray-900 dark:bg-gray-100 dark:hover:bg-gray-200',
                                    !unclickable
                                        ? 'hover:bg-gray-800'
                                        : 'hover:bg-gray-900',
                                )
                            }
                            loading={false}
                            onClick={handleInvite}
                        >
                            Invite
                        </Button>
                    }
                />
            </div>
            <div className="mt-6 flex justify-between items-center">
                <Button
                    variant="plain"
                    size="md"
                    icon={<TbLink />}
                    onClick={handleCopy}
                >
                    Copy link
                </Button>
                <Button variant="solid" size="md" onClick={handleDialogClose}>
                    Done
                </Button>
            </div>
        </Dialog>
    )
}

export default FileManagerInviteDialog
