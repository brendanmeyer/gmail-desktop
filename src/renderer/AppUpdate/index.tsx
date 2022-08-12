import React, { ComponentProps } from 'react'
import {
  Button as ChakraButton,
  Text,
  Spacer,
  Progress,
  Alert,
  HStack
} from '@chakra-ui/react'
import { AppUpdateStatus } from '../../types'
import { topElementHeight } from '../../constants'
import { appRegionNoDragStyle, isMacOS } from '../helpers'
import TrafficLightsSpace from '../TrafficLightsSpace'

function Button({
  onClick,
  ...props
}: ComponentProps<typeof ChakraButton> & { onClick: () => void }) {
  return (
    <ChakraButton
      size="xs"
      variant="ghost"
      onClick={() => {
        if (onClick) {
          onClick()
        }
      }}
      _focus={{
        outline: 'none'
      }}
      style={appRegionNoDragStyle}
      {...props}
    />
  )
}

export interface AppUpdateProps {
  status: AppUpdateStatus
  version: string
  downloadPercent: number
  isReleaseNotesVisible?: boolean
  onDownload: () => void
  onToggleReleaseNotes: (visible: boolean) => void
  onDismiss: () => void
  onSkipVersion: (version: string) => void
  onCancelDownload: () => void
  onRestart: () => void
}

export default function AppUpdate({
  status,
  version,
  isReleaseNotesVisible,
  downloadPercent,
  onDownload,
  onToggleReleaseNotes,
  onDismiss,
  onSkipVersion,
  onCancelDownload,
  onRestart
}: AppUpdateProps) {
  const releaseNotesButton = (
    <Button
      onClick={() => {
        onToggleReleaseNotes(!isReleaseNotesVisible)
      }}
    >
      {isReleaseNotesVisible ? 'Hide' : 'Show'} Release Notes
    </Button>
  )

  const normalizedVersion = `(v${version})`

  const renderContent = () => {
    if (status === 'available') {
      return (
        <>
          <Text fontSize="xs">An update is available {normalizedVersion}</Text>
          <Spacer />
          <HStack>
            <Button
              variant="solid"
              onClick={() => {
                onDownload()
              }}
            >
              Download Now
            </Button>
            <Button onClick={onDismiss}>Remind Later</Button>
            <Button
              onClick={() => {
                onSkipVersion(version)
              }}
            >
              Skip Version
            </Button>
            {releaseNotesButton}
          </HStack>
        </>
      )
    }

    if (status === 'downloading') {
      return (
        <>
          <HStack flex={1}>
            <Text fontSize="xs">
              Downloading update {normalizedVersion} ...
            </Text>
            <Text fontSize="xs">{downloadPercent}%</Text>
            <Progress
              value={downloadPercent}
              size="sm"
              flex={1}
              borderRadius="100px"
            />
            <Button onClick={onCancelDownload}>Cancel</Button>
            {releaseNotesButton}
          </HStack>
        </>
      )
    }

    if (status === 'install') {
      return (
        <>
          <Text fontSize="xs">
            An app restart is required to install the update {normalizedVersion}
          </Text>
          <Spacer />
          <HStack>
            <Button variant="solid" onClick={onRestart}>
              Restart Now
            </Button>
            <Button onClick={onDismiss}>Later</Button>
            {releaseNotesButton}
          </HStack>
        </>
      )
    }

    return null
  }

  return (
    <Alert height={`${topElementHeight}px`}>
      {isMacOS && <TrafficLightsSpace />}
      {renderContent()}
    </Alert>
  )
}
