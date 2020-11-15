import React, { useContext, useState } from 'react';
import StyledReactModal from 'styled-react-modal';
import { Form, InputNumber, message, Radio, Select } from 'antd';
import ClipLoader from 'react-spinners/ClipLoader';
import { ModalContext } from '../../context/ModalContext';
import { ApiContext } from '../../context/ApiContext';

import classes from './BecomeProjectCoachModal.module.scss';
import { Title } from '../Typography';
import {
  BecomeProjectCoach,
  ProjectField,
  TutorJufoParticipationIndication,
} from '../../types/ProjectCoach';
import Button from '../button';
import { UserContext } from '../../context/UserContext';
import { dev } from '../../api/config';

const BecomeProjectCoachModal = () => {
  const [loading, setLoading] = useState(false);

  const modalContext = useContext(ModalContext);
  const userContext = useContext(UserContext);
  const api = useContext(ApiContext);

  const onFinish = (onFinish) => {
    console.log('On finish');

    if (onFinish.projectFields === 0) {
      return;
    }
    setLoading(true);

    const projectCoachData: BecomeProjectCoach = {
      wasJufoParticipant: onFinish.wasJufoParticipant,
      hasJufoCertificate: onFinish.hasJufoCertificate,
      projectFields: onFinish.projectFields.map((p) => ({
        name: p.name,
        min: p.minGrade,
        max: p.maxGrade,
      })),
    };

    api
      .postUserRoleProjectCoach(projectCoachData)
      .then(() => {
        message.success('Du wurdest als Projektcoach angemeldet.');
        modalContext.setOpenedModal(null);
        userContext.fetchUserData();
      })
      .catch((err) => {
        if (dev) console.error(err);
        message.error('Etwas ist schief gegangen.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <StyledReactModal
        isOpen={modalContext.openedModal === 'becomeProjectCoach'}
      >
        <div className={classes.modal}>
          <Title size="h2">Projektcoach werden</Title>
          <ClipLoader size={100} color="#123abc" loading />
          <div className={classes.buttonContainer}>
            <Button backgroundColor="#F4F6FF" color="#4E6AE6">
              Anmelden
            </Button>
          </div>
        </div>
      </StyledReactModal>
    );
  }

  return (
    <StyledReactModal
      isOpen={modalContext.openedModal === 'becomeProjectCoach'}
      onBackgroundClick={() => modalContext.setOpenedModal(null)}
    >
      <div className={classes.modal}>
        <Title size="h2">Projektcoach werden</Title>
        <Form
          onFinish={onFinish}
          className={classes.formContainer}
          layout="vertical"
          name="basic"
        >
          <Form.Item
            className={classes.formItem}
            label="Hast du in der Vergangenheit an Jugend Forscht teilgenommen?"
            name="wasJufoParticipant"
            rules={[
              {
                required: true,
                message:
                  'Bitte gebe, ob du an Jugend Forscht teilgenommen hast',
              },
            ]}
          >
            <Radio.Group>
              <Radio value={TutorJufoParticipationIndication.YES}>Ja</Radio>
              <Radio value={TutorJufoParticipationIndication.NO}>Nein</Radio>
              <Radio value={TutorJufoParticipationIndication.IDK}>
                Weiß nicht
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.List name="projectFields">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <>
                    <Form.Item
                      name={[field.name, 'name']}
                      rules={[
                        {
                          required: true,
                          message:
                            'Bitte trage ein, in welchen Themenbereichen du unterstützen möchtest.',
                        },
                      ]}
                    >
                      <Select
                        placeholder="Bitte wähle einen Themenbereich aus."
                        options={Object.entries(ProjectField).map((e) => ({
                          label: e[1],
                          value: e[1],
                        }))}
                      />
                    </Form.Item>
                    Klassenstufe
                    <Form.Item
                      name={[field.name, 'minGrade']}
                      rules={[
                        {
                          required: true,
                          message:
                            'Bitte trage ein, ab welcher Klassenstufe du Projektcoaching anbieten möchtest.',
                        },
                      ]}
                    >
                      <InputNumber min={1} max={13} />
                    </Form.Item>
                    bis
                    <Form.Item
                      name={[field.name, 'maxGrade']}
                      rules={[
                        {
                          required: true,
                          message:
                            'Bitte trage ein, bis zu welcher Klassenstufe du Projektcoaching anbieten möchtest.',
                        },
                      ]}
                    >
                      <InputNumber min={1} max={13} />
                    </Form.Item>
                    <Button onClick={() => remove(field.name)}>
                      Entfernen
                    </Button>
                  </>
                ))}
                <Button onClick={() => add()}>Bereich hinzufügen</Button>
              </>
            )}
          </Form.List>
          <Form.Item>
            <div className={classes.buttonContainer}>
              <Button backgroundColor="#F4F6FF" color="#4E6AE6" type="submit">
                Anmelden
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </StyledReactModal>
  );
};

export default BecomeProjectCoachModal;
