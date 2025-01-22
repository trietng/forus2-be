import { Report, IReport, ReportPageSize } from "api/models/report";
import { Types } from "mongoose";
import { CommentService } from "./comment.service";

export type ProcessedReport = IReport & { _id: Types.ObjectId, link: any };

export class ReportService {
    static async getReports(page: number) {
        const reports = await Report.find({}).populate({
            path: 'author',
            select: '_id displayName avatarUrl role'
        }).skip((page - 1) * ReportPageSize).limit(ReportPageSize);
        const totalResults = await Report.countDocuments({});
        const pageCount = Math.ceil(totalResults / ReportPageSize); 
        let processed: ProcessedReport[] = [];
        if (pageCount >= page) {
            processed = await Promise.all(reports.map(async (report) => {
                let link: any;
                if (report.contentType === 'thread') {
                    link = `/threads/${report.contentId}`;
                } else {
                    link = await CommentService.findRelativeLocationInThread(report.contentId.toHexString());
                }
                return {
                    ...report.toObject(),
                    link: link
                };
            }));
        }
        return {
            reports: processed,
            pageCount: pageCount
        };
    }

    static async createReport(report: IReport) {
        const newReport = new Report(report);
        await newReport.save();
    }

    static async deleteReport(id: string) {
        await Report.findByIdAndDelete(id);
    }
}