import React from 'react'
import {
  Container,
  Input,
  Flex,
  Heading,
  Tag,
  Button,
  Spacer,
  FormControl,
  FormLabel
} from '@chakra-ui/react'
import { Account } from '../../types'
import { Except } from 'type-fest'
import { defaultAccountId } from '../../constants'

interface EditAccountProps {
  account: Except<Account, 'selected'>
  onSave: (account: Except<Account, 'selected'>) => void
  onCancel: () => void
  onRemove: (accountId: string) => void
}

function EditAccount({
  onSave,
  onCancel,
  onRemove,
  ...props
}: EditAccountProps) {
  const [account, setAccount] = React.useState(props.account)
  const { id, label } = account

  const isLabelRequired = label.length === 0

  const editAccount = () => {
    if (label) {
      onSave({ id, label })
    }
  }

  return (
    <Container>
      <Heading mb="2">Edit Account</Heading>
      <Tag mb="8">ID: {id}</Tag>
      <FormControl mb="8" isRequired>
        <FormLabel htmlFor="label">Label</FormLabel>
        <Input
          id="label"
          placeholder="Work, work@example.com, ..."
          value={label}
          onKeyPress={(event) => {
            if (event.key === 'Enter') {
              editAccount()
            }
          }}
          onChange={(event) => {
            setAccount({ id, label: event.target.value })
          }}
          isInvalid={isLabelRequired}
          autoFocus
        />
      </FormControl>
      <Flex justifyContent="flex-end">
        <Button
          colorScheme="red"
          variant="outline"
          onClick={() => {
            onRemove(id)
          }}
          disabled={id === defaultAccountId}
        >
          Remove
        </Button>
        <Spacer />
        <Button
          mr="2"
          onClick={() => {
            onCancel()
          }}
        >
          Cancel
        </Button>
        <Button
          colorScheme="blue"
          onClick={() => {
            editAccount()
          }}
          disabled={isLabelRequired}
        >
          Save
        </Button>
      </Flex>
    </Container>
  )
}

export default EditAccount
