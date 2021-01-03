import React from 'react';
import Icons from '../../assets/icons';
import Images from '../../assets/images';
import { LinkButton } from '../button';
import classes from './CourseBanner.module.scss';
import { Title, Text } from '../Typography';

interface Props {
  showImage?: boolean;
}

export const CourseBanner: React.FC<Props> = (props) => {
  return (
    <div className={classes.courseOverviewContainer}>
      <div className={classes.hightightCourse} />
      <div className={classes.couseOverviewContent}>
        <div className={classes.courseOverviewHeader}>
          <div className={classes.textLeft}>
            <Title size="h2" bold className={classes.title}>
              Unser neues Kursangebot
            </Title>
            <Text large>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam
            </Text>
          </div>
          <LinkButton
            href="/courses/overview"
            local
            backgroundColor="#4E6AE6"
            color="white"
            className={classes.courseButton}
          >
            <Icons.Search height="16px" />
            Kursangebote entdecken
          </LinkButton>
        </div>
        {props.showImage && (
          <Images.Graduation className={classes.graduationImage} />
        )}
      </div>
    </div>
  );
};
