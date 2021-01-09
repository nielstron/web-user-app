/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useContext, useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import ClipLoader from 'react-spinners/ClipLoader';
import moment from 'moment';

import {
  DeleteOutlined,
  MailOutlined,
  CheckCircleOutlined,
  DownOutlined,
  ShareAltOutlined,
  WhatsAppOutlined,
  CopyOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import {
  Empty,
  Descriptions,
  Menu,
  Dropdown,
  message,
  Button as AntdButton,
  List,
  Tooltip,
} from 'antd';
import AddInstructorModal from '../components/Modals/AddInstructorModal';
import { ApiContext } from '../context/ApiContext';
import { AuthContext } from '../context/AuthContext';
import {
  ParsedCourseOverview,
  CourseState,
  Course,
  SubCourse,
  Tag as CourseTag,
} from '../types/Course';
import { Title, Text } from '../components/Typography';
import { Tag } from '../components/Tag';
import 'moment/locale/de';
import classes from './CourseDetail.module.scss';
import { UserContext } from '../context/UserContext';
import { parseCourse } from '../utils/CourseUtil';
import {
  CategoryToLabel,
  CourseStateToLabel,
} from '../components/cards/MyCourseCard';

import { ModalContext } from '../context/ModalContext';
import CourseMessageModal from '../components/Modals/CourseMessageModal';
import { dev } from '../api/config';
import CourseDeletionConfirmationModal from '../components/Modals/CourseDeletionConfirmationModal';
import CourseConfirmationModal from '../components/Modals/CourseConfirmationModal';

moment.locale('de');

const CourseDetail = (params: { id?: string }) => {
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState<ParsedCourseOverview | null>(null);
  const [isLoadingVideoChat, setIsLoadingVideoChat] = useState(false);
  const [courseConfirmationMode, setCourseConfirmationMode] = useState<
    'quit' | 'join'
  >('join'); // Mode for the confirmation modal
  const [isCustomShareMenuVisible, setIsCustomShareMenuVisible] = useState(
    false
  );
  const [tags, setTags] = useState<CourseTag[]>([]);

  const { id: urlParamID } = useParams() as { id: string };
  const id = params.id ?? urlParamID;

  const api = useContext(ApiContext);
  const userContext = useContext(UserContext);
  const isStudent = userContext.user.type === 'student';

  const history = useHistory();

  const auth = useContext(AuthContext);
  const modalContext = useContext(ModalContext);
  const userId = auth.credentials.id;

  const updateCourseDetails = () => {
    setLoading(true);
    api
      .getCourse(id)
      .then((course) => {
        setCourse(parseCourse(course));
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
    setLoading(true);
    api
      .getCourseTags()
      .then((response) => {
        setTags(response);
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) {
      updateCourseDetails();
    }
  }, [api, id, setTags]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!course || !course.subcourse) {
    return <div>Wir konnten den Kurs leider nicht finden.</div>;
  }

  const isMyCourse = course.instructors.some((i) => i.id === userId);

  const submitCourse = () => {
    const { category } = course;
    const tagObj = tags.filter((t) => t.category === category);

    const apiCourse: Course = {
      instructors: course.instructors.map((i) => i.id),
      name: course.name,
      outline: course.outline,
      description: course.description,
      category: course.category,
      tags: course.tags.map((t) => tagObj.find((o) => o.name === t.name)?.id),
      submit: true,
      allowContact: course.allowContact,
    };

    const apiSubCourse: SubCourse = {
      minGrade: course.subcourse.minGrade,
      maxGrade: course.subcourse.maxGrade,
      instructors: course.subcourse.instructors.map((i) => i.id),
      joinAfterStart: course.subcourse.joinAfterStart,
      maxParticipants: course.subcourse.maxParticipants,
      published: true,
    };

    api
      .submitCourse(course.id, apiCourse)
      .then(() => {
        setCourse({ ...course, state: CourseState.SUBMITTED });
        return api.publishSubCourse(
          course.id,
          course.subcourse.id,
          apiSubCourse
        );
      })
      .then(() => {
        message.success('Kurs wurde zur Prüfung freigegeben.');
      })
      .catch((err) => {
        if (dev) console.error(err);
        message.error('Kurs konnte nicht zur Prüfung freigegeben werden.');
      });
  };

  const joinCourse = () => {
    if (course.subcourse.joined) {
      setCourseConfirmationMode('quit');
      modalContext.setOpenedModal('courseConfirmationModal');
    } else {
      setCourseConfirmationMode('join');
      modalContext.setOpenedModal('courseConfirmationModal');
    }
  };

  const joinWaitingList = () => {
    if (course.subcourse.onWaitingList) {
      api
        .leaveCourseWaitingList(course.id, course.subcourse.id, userId)
        .then(() => {
          setCourse({
            ...course,
            subcourse: {
              ...course.subcourse,
              onWaitingList: false,
            },
          });
          message.success('Du hast die Warteliste verlassen.');
        });
    } else {
      api
        .joinCourseWaitingList(course.id, course.subcourse.id, userId)
        .then(() => {
          setCourse({
            ...course,
            subcourse: {
              ...course.subcourse,
              onWaitingList: true,
            },
          });
          message.success(
            'Du wurdest erfolgreich zur Warteliste hinzugefügt. Wir benachrichtigen dich, falls ein Platz frei wird. Schau also regelmäßig in deine Mails.',
            6 // for longer time
          );
        });
    }
  };

  const joinBBBmeeting = () => {
    setIsLoadingVideoChat(true);
    api
      .joinBBBmeeting(course.id, course.subcourse.id)
      .then((res) => {
        setIsLoadingVideoChat(false);
        // use window.location to not have problems with popup blocking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.location.href = (res as any).url;
      })
      .catch((err) => {
        setIsLoadingVideoChat(false);
        if (err?.response?.status === 400) {
          message.error(
            'Der Videochat wurde noch nicht gestartet. Du musst auf die*den Kursleiter*in warten. Probiere es später bzw. kurz vorm Beginn des Kurses noch einmal.'
          );
        } else {
          message.error(
            'Ein unerwarter Fehler ist aufgetreten. Versuche, die Seite neuzuladen.'
          );
        }
      });
  };

  const openWriteMessageModal = () => {
    modalContext.setOpenedModal('courseMessageModal');
  };

  const shareData = {
    title: course.name,
    text: 'Guck dir diesen kostenlosen Kurs der Corona School an!',
    url: `${window.location.protocol}//${window.location.hostname}/public/courses/${course.id}`,
  };

  const copyCourseLink = async () => {
    if (!navigator.clipboard) {
      message.error('Dein Browser unterstützt das nicht 😔');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);

      message.success('Link wurde in die Zwischenablage kopiert!');
    } catch {
      message.error('Link konnte nicht kopiert werden!');
    }
  };

  const whatsAppShareURL = `whatsapp://send?text=${shareData.text} ${shareData.url}`;

  const antdShareMenu = (
    <Menu>
      <Menu.Item icon={<CopyOutlined />} key="copyLink">
        <span onClick={copyCourseLink}>Link kopieren</span>
      </Menu.Item>
      <Menu.Item icon={<WhatsAppOutlined />} key="shareWhatsApp">
        <a
          href={whatsAppShareURL}
          data-action="share/whatsapp/share"
          className={classes.shareLink}
        >
          WhatsApp
        </a>
      </Menu.Item>
    </Menu>
  );

  const tsNavigator = navigator; // so that typescript compiles with share

  const shareCourse = () => {
    if (tsNavigator.share) {
      setIsCustomShareMenuVisible(false);
      tsNavigator.share(shareData);
    } else {
      setIsCustomShareMenuVisible(true);
    }
  };

  const hasJoiningRights = () => {
    return !(!course.subcourse || isStudent);
  };

  const isEligibleForJoining = () => {
    // correct values?
    if (!hasJoiningRights()) {
      return false;
    }

    // already started or late join?
    const hasCourseStarted = course.subcourse.lectures.some((l) =>
      moment.unix(l.start).isBefore(moment())
    );
    if (!course.subcourse.joinAfterStart && hasCourseStarted) {
      return false;
    }

    // fitting grades?
    if (
      userContext.user.grade >= course.subcourse.minGrade &&
      userContext.user.grade <= course.subcourse.maxGrade
    ) {
      return true;
    }

    return false;
  };

  const canJoinWaitingList = () => {
    return (
      isEligibleForJoining() &&
      course.subcourse.participants >= course.subcourse.maxParticipants
    );
  };

  const canJoinCourse = () => {
    return (
      isEligibleForJoining() &&
      !course.subcourse.joined &&
      course.subcourse.participants < course.subcourse.maxParticipants
    );
  };

  const canDisjoinCourse = () => {
    return hasJoiningRights() && course.subcourse.joined;
  };

  const canDisjoinWaitingList = () => {
    return hasJoiningRights && course.subcourse.onWaitingList;
  };

  const joinButtonTitle = () => {
    if (canJoinCourse()) {
      return `Teilnehmen${
        course.subcourse.onWaitingList ? ' und Warteliste verlassen' : ''
      }`;
    }
    if (course.subcourse.joined) {
      return 'Verlassen';
    }
    if (course.subcourse.onWaitingList) {
      return 'Warteliste verlassen';
    }

    return 'auf Warteliste';
  };

  const joinButtonAction = () => {
    if (canJoinCourse() || canDisjoinCourse()) {
      joinCourse();
    } else if (canJoinWaitingList() || canDisjoinWaitingList()) {
      joinWaitingList();
    }
  };

  const renderLectures = () => {
    if (!course.subcourse) {
      return <div>Keine Lektionen geplant.</div>;
    }

    return course.subcourse.lectures
      .sort((a, b) => a.start - b.start)
      .map((l, i) => {
        return (
          <div className={classes.newsContent} key={l.id}>
            <div className={classes.newsHeadline}>
              <Tag>{moment.unix(l.start).format('DD.MM')}</Tag>
              <Tag>
                {moment.unix(l.start).format('HH:mm')}-
                {moment
                  .unix(l.start)
                  .add(l.duration, 'minutes')
                  .format('HH:mm')}{' '}
                Uhr
              </Tag>
              <Title bold size="h5">
                Lektion {i + 1}
              </Title>
            </div>

            <Text>
              Die {i + 1}te Lektion{' '}
              {moment.unix(l.start).isAfter(Date.now()) ? 'findet' : 'fand'}{' '}
              {moment.unix(l.start).fromNow()} statt und dauert
              {moment.unix(l.start).isAfter(Date.now())
                ? ''
                : 'e'} ungefähr {l.duration}min. Der Kurs ist für Schüler in der{' '}
              {course.subcourse.minGrade}-{course.subcourse.maxGrade} Klasse.{' '}
              <br />
              Tutor: {l.instructor.firstname} {l.instructor.lastname}
            </Text>
          </div>
        );
      });
  };

  const renderParticipants = () => {
    if (!course.subcourse) {
      return null;
    }
    if (course.subcourse.participants === 0) {
      return <Empty description="Du hast noch keine Teilnehmer*innen" />;
    }

    return (
      <div>
        <List
          style={{
            margin: '10px',
            maxWidth: '800px',
            background: 'white',
            padding: '4px',
          }}
          itemLayout="horizontal"
          dataSource={course.subcourse.participantList}
          renderItem={(item) => (
            <List.Item
              actions={[
                <div>{item.schooltype}</div>,
                <span>{item.grade} Klasse</span>,
              ]}
            >
              <List.Item.Meta
                title={`${item.firstname} ${item.lastname}`}
                description={<a href={`mailto:${item.email}`}>{item.email}</a>}
              />
            </List.Item>
          )}
        />
      </div>
    );
  };

  const renderCourseInformation = () => {
    const getMenu = () => (
      <Menu
        onClick={(param) => {
          if (param.key === '2') {
            submitCourse();
          }
          if (param.key === '3') {
            openWriteMessageModal();
          }
          if (param.key === '4') {
            modalContext.setOpenedModal('courseDeletionConfirmationModal');
          }
          if (param.key === '5') {
            history.push(`/courses/edit/${course.id}`);
          }
          if (param.key === '6') {
            modalContext.setOpenedModal('addInstructorModal');
          }
        }}
      >
        {course.state === CourseState.CREATED && (
          <Menu.Item key="2" icon={<CheckCircleOutlined />}>
            Zur Prüfung freigeben
          </Menu.Item>
        )}
        <Menu.Item
          key="3"
          icon={<MailOutlined />}
          disabled={course.subcourse.participantList.length === 0}
        >
          Nachricht senden
        </Menu.Item>
        {course.state !== CourseState.CANCELLED && (
          <Menu.Item key="4" icon={<DeleteOutlined />}>
            Löschen
          </Menu.Item>
        )}

        <Menu.Item key="5" icon={<CheckCircleOutlined />}>
          Bearbeiten
        </Menu.Item>

        {course.state !== CourseState.CANCELLED && (
          <Menu.Item key="6" icon={<UserAddOutlined />}>
            Tutor*in hinzufügen
          </Menu.Item>
        )}
      </Menu>
    );

    const instructors = [
      ...course.subcourse.instructors,
      ...course.instructors,
    ].map((i) => `${i.firstname} ${i.lastname}`);

    return (
      <div className={classes.statusContainer}>
        <div className={classes.headerContainer}>
          <div>
            <Title size="h1" style={{ margin: '0px 20px 10px 8px' }}>
              {course.name}
            </Title>
            <Title size="h5" style={{ margin: '-4px 10px 0px 10px' }}>
              {course.outline}
            </Title>
          </div>
          <div className={classes.actionContainer}>
            {isMyCourse && (
              <Dropdown overlay={getMenu()}>
                {course.state === CourseState.CREATED ? (
                  <AntdButton
                    type="primary"
                    style={{
                      backgroundColor: '#FCD95C',
                      borderColor: '#FCD95C',
                      color: '#373E47',
                    }}
                    onClick={() => {
                      submitCourse();
                    }}
                  >
                    <CheckCircleOutlined /> Zur Prüfung freigeben
                  </AntdButton>
                ) : (
                  <AntdButton>
                    Einstellungen <DownOutlined />
                  </AntdButton>
                )}
              </Dropdown>
            )}
            {(canJoinCourse() ||
              canJoinWaitingList() ||
              canDisjoinCourse() ||
              canDisjoinWaitingList()) && (
              <AntdButton
                type="primary"
                style={{
                  backgroundColor:
                    course.subcourse.joined || course.subcourse.onWaitingList
                      ? '#F4486D'
                      : '#FCD95C',
                  borderColor:
                    course.subcourse.joined || course.subcourse.onWaitingList
                      ? '#F4486D'
                      : '#FCD95C',
                  color:
                    course.subcourse.joined || course.subcourse.onWaitingList
                      ? 'white'
                      : '#373E47',
                  width: '120px',
                  margin: '0px 10px',
                  height: 'auto',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                }}
                onClick={joinButtonAction}
              >
                {joinButtonTitle()}
              </AntdButton>
            )}
            <div className={classes.videochatAction}>
              {((isMyCourse && course.state === CourseState.ALLOWED) ||
                course.subcourse.joined) && (
                <AntdButton
                  type="primary"
                  style={{
                    backgroundColor: '#FCD95C',
                    borderColor: '#FCD95C',
                    color: '#373E47',
                    width: '120px',
                    margin: '5px 10px',
                  }}
                  onClick={joinBBBmeeting}
                >
                  Zum Videochat
                </AntdButton>
              )}
              <ClipLoader
                size={15}
                color="#123abc"
                loading={isLoadingVideoChat}
              />
            </div>
            <div className={classes.contactInstructorsAction}>
              {course.subcourse.joined && course.allowContact && (
                <AntdButton
                  type="primary"
                  style={{
                    backgroundColor: '#FCD95C',
                    borderColor: '#FCD95C',
                    color: '#373E47',
                    width: '120px',
                    margin: '5px 10px',
                  }}
                  onClick={openWriteMessageModal}
                  icon={<MailOutlined />}
                >
                  Kontakt
                </AntdButton>
              )}
            </div>
            <div className={classes.shareAction}>
              <Dropdown
                overlay={antdShareMenu}
                trigger={['click']}
                visible={isCustomShareMenuVisible}
                onVisibleChange={(v) => !v && setIsCustomShareMenuVisible(v)}
              >
                <AntdButton
                  type="primary"
                  style={{
                    backgroundColor: '#FCD95C',
                    borderColor: '#FCD95C',
                    color: '#373E47',
                    width: '120px',
                    margin: '5px 10px',
                  }}
                  onClick={shareCourse}
                  icon={<ShareAltOutlined />}
                >
                  Kurs teilen
                </AntdButton>
              </Dropdown>
            </div>
          </div>
        </div>

        <Descriptions
          column={3}
          size="small"
          style={{ margin: '10px', maxWidth: '700px' }}
        >
          {isMyCourse && (
            <Descriptions.Item label="Status">
              <Tag
                background={
                  course.state === CourseState.CANCELLED ||
                  course.state === CourseState.DENIED
                    ? '#F4486D'
                    : '#FCD95C'
                }
                color={
                  course.state === CourseState.CANCELLED ||
                  course.state === CourseState.DENIED
                    ? 'white'
                    : '#373E47'
                }
                style={{ fontSize: '12px', margin: 0 }}
              >
                {CourseStateToLabel.get(course.state)}
              </Tag>
            </Descriptions.Item>
          )}
          {isMyCourse && (
            <Descriptions.Item label="Sichtbarkeit">
              {course.subcourse?.published ? (
                'Öffentlich'
              ) : (
                <Tooltip title="Der Kurs ist nur für dich sichtbar.">
                  <span>Privat</span>
                </Tooltip>
              )}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Kategorie">
            {CategoryToLabel.get(course.category)}
          </Descriptions.Item>
          <Descriptions.Item label="Teilnehmende">
            {course.subcourse.participants}/{course.subcourse.maxParticipants}
          </Descriptions.Item>
          <Descriptions.Item label="Klasse">
            {course.subcourse.minGrade}-{course.subcourse.maxGrade}{' '}
          </Descriptions.Item>
          <Descriptions.Item label="Anzahl">
            {course.subcourse.lectures.length} Lektionen
          </Descriptions.Item>
          <Descriptions.Item label="Dauer">
            {course.subcourse.lectures
              .map((l) => `${l.duration}min.`)
              .join(', ')}{' '}
          </Descriptions.Item>
          <Descriptions.Item label="Tutor*innen">
            {instructors
              .filter((item, pos) => instructors.indexOf(item) === pos)
              .join(', ')}
          </Descriptions.Item>
          {isMyCourse && (
            <Descriptions.Item label="Kontaktieren">
              {course.allowContact ? 'erlaubt' : 'deaktiviert'}
            </Descriptions.Item>
          )}
        </Descriptions>
        <Descriptions
          size="small"
          layout="vertical"
          column={1}
          style={{ margin: '10px', maxWidth: '700px' }}
        >
          <Descriptions.Item label="Beschreibung">
            <Text large>
              <i style={{ whiteSpace: 'pre-wrap' }}>{course.description}</i>
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tags">
            {course.tags.map((t) => {
              return <Tag key={t.id}>{t.name}</Tag>;
            })}
          </Descriptions.Item>
        </Descriptions>
        {isMyCourse && (
          <div>
            <Title size="h3" style={{ margin: '0px 10px' }}>
              Teilnehmer*innen
            </Title>
            <div>{renderParticipants()}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={classes.container}>
      <div className={classes.topGrid}>
        {renderCourseInformation()}

        <div>
          <div className={classes.newsContainer}>
            <Title size="h3" bold>
              Lektionen
            </Title>

            <div className={classes.newsContentContainer}>
              {renderLectures()}
            </div>
          </div>
        </div>
      </div>
      <CourseMessageModal
        courseId={course.id}
        subcourseId={course.subcourse.id}
        type={
          isMyCourse ? 'instructorToParticipants' : 'participantToInstructors'
        }
      />
      <CourseDeletionConfirmationModal courseId={course.id} />
      <AddInstructorModal
        courseId={course.id}
        updateDetails={updateCourseDetails}
      />
      <CourseConfirmationModal
        mode={courseConfirmationMode}
        course={course}
        setCourse={setCourse}
      />
    </div>
  );
};

export default CourseDetail;
