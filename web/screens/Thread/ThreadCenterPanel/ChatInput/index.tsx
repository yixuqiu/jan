import { useEffect, useRef, useState } from 'react'

import { TextArea, Button, useMediaQuery } from '@janhq/joi'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  StopCircle,
  SettingsIcon,
  ChevronUpIcon,
  Settings2Icon,
} from 'lucide-react'

import { twMerge } from 'tailwind-merge'

import ModelDropdown from '@/containers/ModelDropdown'
import { currentPromptAtom } from '@/containers/Providers/Jotai'

import { showRightPanelAtom } from '@/helpers/atoms/App.atom'
import { getCurrentChatMessagesAtom } from '@/helpers/atoms/ChatMessage.atom'
import { spellCheckAtom } from '@/helpers/atoms/Setting.atom'
import {
  activeThreadAtom,
  getActiveThreadIdAtom,
  isGeneratingResponseAtom,
  waitingToSendMessage,
} from '@/helpers/atoms/Thread.atom'
import { activeTabThreadRightPanelAtom } from '@/helpers/atoms/ThreadRightPanel.atom'

type Props = {
  sendMessage: (message: string) => void
  stopInference: () => void
}

const ChatInput: React.FC<Props> = ({ sendMessage, stopInference }) => {
  const activeThread = useAtomValue(activeThreadAtom)
  const messages = useAtomValue(getCurrentChatMessagesAtom)
  const [activeSetting, setActiveSetting] = useState(false)
  const spellCheck = useAtomValue(spellCheckAtom)

  const [currentPrompt, setCurrentPrompt] = useAtom(currentPromptAtom)

  const activeThreadId = useAtomValue(getActiveThreadIdAtom)
  const [isWaitingToSend, setIsWaitingToSend] = useAtom(waitingToSendMessage)
  // const [fileUpload, setFileUpload] = useAtom(fileUploadAtom)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isGeneratingResponse = useAtomValue(isGeneratingResponseAtom)

  const setActiveTabThreadRightPanel = useSetAtom(activeTabThreadRightPanelAtom)

  const onPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentPrompt(e.target.value)
  }

  const [showRightPanel, setShowRightPanel] = useAtom(showRightPanelAtom)

  const matches = useMediaQuery('(max-width: 880px)')

  useEffect(() => {
    if (isWaitingToSend && activeThreadId) {
      setIsWaitingToSend(false)
      sendMessage(currentPrompt)
    }
  }, [
    activeThreadId,
    isWaitingToSend,
    currentPrompt,
    setIsWaitingToSend,
    sendMessage,
  ])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [activeThreadId])

  useEffect(() => {
    if (textareaRef.current?.clientHeight) {
      textareaRef.current.style.height = activeSetting ? '100px' : '40px'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      textareaRef.current.style.overflow =
        textareaRef.current.clientHeight >= 390 ? 'auto' : 'hidden'
    }
  }, [textareaRef.current?.clientHeight, currentPrompt, activeSetting])

  const onKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (isGeneratingResponse) return
      if (messages[messages.length - 1]?.status !== 'in_progress')
        sendMessage(currentPrompt)
      else stopInference()
    }
  }

  /**
   * Handles the change event of the extension file input element by setting the file name state.
   * Its to be used to display the extension file name of the selected file.
   * @param event - The change event object.
   */
  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (!file) return
  //   setFileUpload([{ file: file, type: 'pdf' }])
  // }

  // const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (!file) return
  //   setFileUpload([{ file: file, type: 'image' }])
  // }

  // const renderPreview = (fileUpload: any) => {
  //   if (fileUpload.length > 0) {
  //     if (fileUpload[0].type === 'image') {
  //       return <ImageUploadPreview file={fileUpload[0].file} />
  //     } else {
  //       return <FileUploadPreview />
  //     }
  //   }
  // }

  return (
    <div className="relative p-4 pb-2">
      <div className="relative flex w-full flex-col">
        {/* {renderPreview(fileUpload)} */}
        <TextArea
          className={twMerge(
            'relative max-h-[400px] resize-none  pr-20',
            // fileUpload.length && 'rounded-t-none',
            activeSetting && 'pb-14 pr-16'
          )}
          spellCheck={spellCheck}
          data-testid="txt-input-chat"
          style={{ height: activeSetting ? '100px' : '40px' }}
          ref={textareaRef}
          onKeyDown={onKeyDown}
          placeholder="Ask me anything"
          disabled={!activeThread}
          value={currentPrompt}
          onChange={onPromptChange}
        />
        {/* {experimentalFeature && (
          <Tooltip
            trigger={
              <Button
                theme="icon"
                className="absolute left-3 top-2.5"
                onClick={(e) => {
                  if (
                    fileUpload.length > 0 ||
                    (activeThread?.assistants[0].tools &&
                      !activeThread?.assistants[0].tools[0]?.enabled &&
                      !isVisionModel)
                  ) {
                    e.stopPropagation()
                  } else {
                    setShowAttacmentMenus(!showAttacmentMenus)
                  }
                }}
              >
                <PaperclipIcon
                  size={18}
                  className="text-[hsla(var(--text-secondary))]"
                />
              </Button>
            }
            disabled={
              activeThread?.assistants[0].tools &&
              activeThread?.assistants[0].tools[0]?.enabled
            }
            content={
              <>
                {fileUpload.length > 0 ||
                  (activeThread?.assistants[0].tools &&
                    !activeThread?.assistants[0].tools[0]?.enabled &&
                    !isVisionModel && (
                      <>
                        {fileUpload.length !== 0 && (
                          <span>
                            Currently, we only support 1 attachment at the same
                            time.
                          </span>
                        )}
                        {activeThread?.assistants[0].tools &&
                          activeThread?.assistants[0].tools[0]?.enabled ===
                            false && (
                            <span>
                              Turn on Retrieval in Assistant Settings to use
                              this feature.
                            </span>
                          )}
                      </>
                    ))}
              </>
            }
          />
        )} */}

        <div className={twMerge('absolute right-3 top-1.5')}>
          <div className="flex items-center gap-x-4">
            {!activeSetting && (
              <div className="flex h-8 items-center">
                <Button
                  theme="icon"
                  onClick={() => {
                    setActiveSetting(!activeSetting)
                  }}
                >
                  <SettingsIcon
                    size={18}
                    className="text-[hsla(var(--text-secondary))]"
                  />
                </Button>
              </div>
            )}
            {messages[messages.length - 1]?.status !== 'in_progress' &&
            isGeneratingResponse ? (
              <Button
                theme="destructive"
                onClick={stopInference}
                className="h-8 w-8 rounded-lg p-0"
              >
                <StopCircle size={20} />
              </Button>
            ) : (
              <>
                {currentPrompt.length !== 0 && (
                  <Button
                    disabled={
                      !activeThread || currentPrompt.trim().length === 0
                    }
                    className="h-8 w-8 rounded-lg p-0"
                    data-testid="btn-send-chat"
                    onClick={() => sendMessage(currentPrompt)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="fill-white stroke-white"
                    >
                      <path
                        d="M3.93098 4.26171L3.93108 4.26168L12.9041 1.27032C12.9041 1.27031 12.9041 1.27031 12.9041 1.27031C13.7983 0.972243 14.3972 0.77445 14.8316 0.697178C15.0428 0.659595 15.1663 0.660546 15.2355 0.671861C15.2855 0.680033 15.296 0.690905 15.3015 0.696542C15.3018 0.696895 15.3022 0.697228 15.3025 0.697538C15.3028 0.697847 15.3031 0.698168 15.3035 0.698509C15.3091 0.703965 15.32 0.71449 15.3282 0.764538C15.3395 0.8338 15.3405 0.957246 15.3029 1.16844C15.2258 1.60268 15.0282 2.20131 14.7307 3.09505L11.7383 12.0689L11.7383 12.069C11.3184 13.3293 11.0242 14.2078 10.7465 14.7789C10.6083 15.063 10.4994 15.2158 10.4215 15.292C10.3948 15.3182 10.3774 15.3295 10.3698 15.3338C10.3622 15.3295 10.3449 15.3181 10.3184 15.2921C10.2404 15.2158 10.1314 15.0629 9.99319 14.7788C9.71539 14.2077 9.42091 13.3291 9.00105 12.069L9.00094 12.0687L8.34059 10.0903L12.6391 5.79172L12.6392 5.7918L12.6472 5.78348C12.9604 5.45927 13.1337 5.02503 13.1297 4.57431C13.1258 4.12358 12.945 3.69242 12.6263 3.3737C12.3076 3.05497 11.8764 2.87418 11.4257 2.87027C10.975 2.86635 10.5407 3.03962 10.2165 3.35276L10.2165 3.35268L10.2083 3.36086L5.9106 7.65853L3.93098 6.99895C2.67072 6.57904 1.79218 6.28485 1.22115 6.00715C0.937001 5.86898 0.784237 5.76011 0.707981 5.68215C0.681839 5.65542 0.670463 5.63807 0.666163 5.63051C0.670529 5.62288 0.681934 5.60558 0.707909 5.57904C0.784233 5.50103 0.937088 5.3921 1.22125 5.25386C1.79226 4.97606 2.67087 4.68157 3.93098 4.26171Z"
                        strokeWidth="1.33"
                      />
                    </svg>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {activeSetting && (
          <div
            className={twMerge(
              'absolute bottom-[6px] left-[1px] flex w-[calc(100%-2px)] items-center justify-between rounded-lg bg-[hsla(var(--textarea-bg))] p-3',
              !activeThread && 'bg-transparent'
            )}
          >
            <div className="flex items-center gap-x-3">
              <ModelDropdown chatInputMode />
              <Button
                theme="icon"
                onClick={() => {
                  setActiveTabThreadRightPanel('model')
                  if (matches) {
                    setShowRightPanel(!showRightPanel)
                  } else if (!showRightPanel) {
                    setShowRightPanel(true)
                  }
                }}
              >
                <Settings2Icon
                  size={16}
                  className="flex-shrink-0 cursor-pointer text-[hsla(var(--text-secondary))]"
                />
              </Button>
              {/* {experimentalFeature && (
                <Badge
                  className="flex cursor-pointer items-center gap-x-1"
                  theme="secondary"
                  onClick={() => {
                    setActiveTabThreadRightPanel('tools')
                    if (matches) {
                      setShowRightPanel(!showRightPanel)
                    } else if (!showRightPanel) {
                      setShowRightPanel(true)
                    }
                  }}
                >
                  <ShapesIcon
                    size={16}
                    className="flex-shrink-0 text-[hsla(var(--text-secondary))]"
                  />
                  <span>Tools</span>
                </Badge>
              )} */}
            </div>
            <Button theme="icon" onClick={() => setActiveSetting(false)}>
              <ChevronUpIcon
                size={16}
                className="cursor-pointer text-[hsla(var(--text-secondary))]"
              />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInput
