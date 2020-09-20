import React from 'react';
import classes from './Welcome.module.scss';
import Icons from '../../assets/icons';
import { User } from '../../types';
import { Title } from '../Typography';

interface Props {
  user: User;
}

const Welcome = (props: Props) => {
  const { user } = props;

  return (
    <div className={classes.welcome}>
      <Title size="h4" className={classes.nameDisplay}>
        {`${user.firstname} ${user.lastname}`}
      </Title>
      <div className={classes.icon}>
        <Icons.DefaultProfile />
      </div>
    </div>
  );
};

export default Welcome;
